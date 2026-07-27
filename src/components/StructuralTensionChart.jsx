import React, { useState, useEffect, useRef } from 'react';
import { getChart, createChart, updateChart } from '../api';
import { OFFSET_OPTIONS } from '../templateOffsets';

const escapeICSText = (str) =>
  String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const buildStepICS = (title, description, dueDate) => {
  const dt = dueDate.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD (all-day event)
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@structuretensionchart`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Structure Tension Charting App//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeICSText(title)}`,
    description ? `DESCRIPTION:${escapeICSText(description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
};

const buildSnapshot = (vision, goalDueDate, realityText, notes, actionSteps, completedSteps, manuallyCompleted, chartType) =>
  JSON.stringify({ vision, goalDueDate, realityText, notes, actionSteps, completedSteps, manuallyCompleted, chartType });

// Orders pending steps so the most imminent one is on top: for a template
// that's the smallest "days before" offset (e.g. 1 week before, before
// 1 month before); for a real chart it's the soonest due date. Steps with
// no timing set sort to the bottom either way.
const stepTimingValue = (step, isTemplate) => {
  if (isTemplate) {
    return (step.offsetDays === null || step.offsetDays === undefined) ? Infinity : step.offsetDays;
  }
  return step.dueDate ? new Date(step.dueDate).getTime() : Infinity;
};

const sortStepsByTiming = (steps, isTemplate) =>
  [...steps].sort((a, b) => stepTimingValue(a, isTemplate) - stepTimingValue(b, isTemplate));

const StructuralTensionChart = ({ chartId: initialChartId, chartType: initialChartType = 'work', onBack, ownerId }) => {
  const [chartId, setChartId] = useState(initialChartId || null);
  const [chartType, setChartType] = useState(initialChartType);
  const [isTemplate, setIsTemplate] = useState(false);
  const [vision, setVision] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [realityText, setRealityText] = useState("");
  const [notes, setNotes] = useState("");
  const [actionSteps, setActionSteps] = useState([
    { id: '1', text: "", dueDate: "" }
  ]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [manuallyCompleted, setManuallyCompleted] = useState(false);
  const [status, setStatus] = useState(""); // "loading" | "saving" | "saved" | "error" | ""
  const [showDropSavePopup, setShowDropSavePopup] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const savedSnapshotRef = useRef(null);

  // --- LOAD ON MOUNT (only if editing an existing chart) ---
  useEffect(() => {
    if (!initialChartId) return;
    const load = async () => {
      setStatus("loading");
      try {
        const chart = await getChart(initialChartId);
        if (chart) {
          const loadedChartType = chart.chartType === 'personal' ? 'personal' : initialChartType;
          const loadedGoalDueDate = chart.goalDueDate ? chart.goalDueDate.slice(0, 10) : "";
          const steps = chart.steps || [];
          const loadedActionSteps = steps.filter(s => !s.completed).map(s => ({ id: String(s.id), text: s.text, dueDate: s.dueDate ? s.dueDate.slice(0, 10) : "", offsetDays: s.offsetDays ?? null }));
          const loadedCompletedSteps = steps.filter(s => s.completed).map(s => ({ id: String(s.id), text: s.text, dueDate: s.dueDate ? s.dueDate.slice(0, 10) : "", offsetDays: s.offsetDays ?? null }));
          const loadedManuallyCompleted = chart.status === 'completed';

          setChartId(chart._id);
          setChartType(loadedChartType);
          setIsTemplate(!!chart.isTemplate);
          setVision(chart.goal || "");
          setGoalDueDate(loadedGoalDueDate);
          setRealityText(chart.currentReality || "");
          setNotes(chart.notes || "");
          setActionSteps(loadedActionSteps);
          setCompletedSteps(loadedCompletedSteps);
          setManuallyCompleted(loadedManuallyCompleted);

          savedSnapshotRef.current = buildSnapshot(
            chart.goal || "", loadedGoalDueDate, chart.currentReality || "", chart.notes || "",
            loadedActionSteps, loadedCompletedSteps, loadedManuallyCompleted, loadedChartType
          );
        }
        setStatus("");
      } catch (err) {
        console.error("Failed to load chart:", err);
        setStatus("error");
      }
    };
    load();
  }, [initialChartId]);

  useEffect(() => {
    if (!initialChartId) {
      setChartType(initialChartType);
      setIsTemplate(false);
      savedSnapshotRef.current = buildSnapshot("", "", "", "", actionSteps, [], false, initialChartType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChartId, initialChartType]);

  // --- SAVE ---
  // Accepts optional overrides so callers (like the drag-and-drop handler) can save
  // freshly computed step arrays without waiting on React's async state updates.
  const handleSave = async (overrideActionSteps, overrideCompletedSteps) => {
    setStatus("saving");
    try {
      const stepsForActive = overrideActionSteps ?? actionSteps;
      const stepsForCompleted = overrideCompletedSteps ?? completedSteps;
      const computedStatus = manuallyCompleted
        ? 'completed'
        : (stepsForActive.length > 0 ? 'active' : 'idea');
      const payload = {
        goal: vision,
        goalDate: new Date(),
        goalDueDate: isTemplate ? null : (goalDueDate ? new Date(goalDueDate) : null),
        currentReality: realityText,
        notes,
        currentRealityDate: new Date(),
        status: computedStatus,
        chartType,
        ownerId,
        isTemplate,
        steps: [
          ...stepsForActive.map(s => ({ id: Number(s.id) || Date.now(), text: s.text, completed: false, date: new Date(), dueDate: (!isTemplate && s.dueDate) ? new Date(s.dueDate) : null, offsetDays: isTemplate ? (s.offsetDays ?? null) : null })),
          ...stepsForCompleted.map(s => ({ id: Number(s.id) || Date.now(), text: s.text, completed: true, date: new Date(), dueDate: (!isTemplate && s.dueDate) ? new Date(s.dueDate) : null, offsetDays: isTemplate ? (s.offsetDays ?? null) : null })),
        ],
      };

      if (chartId) {
        await updateChart(chartId, payload);
      } else {
        const created = await createChart(payload);
        setChartId(created._id);
      }
      savedSnapshotRef.current = buildSnapshot(
        vision, goalDueDate, realityText, notes, stepsForActive, stepsForCompleted, manuallyCompleted, chartType
      );
      setStatus("saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      console.error("Failed to save chart:", err);
      setStatus("error");
    }
  };

  // --- DRAG AND DROP LOGIC ---
  const onDragStart = (e, step, index) => {
    e.dataTransfer.setData("step", JSON.stringify(step));
    e.dataTransfer.setData("index", index);
  };

  const onDropToReality = (e) => {
    e.preventDefault();
    const stepData = e.dataTransfer.getData("step");
    const indexData = e.dataTransfer.getData("index");

    if (!stepData) return;

    const step = JSON.parse(stepData);
    const index = parseInt(indexData);

    const newActionSteps = actionSteps.filter((_, i) => i !== index);
    const newCompletedSteps = [...completedSteps, step];

    setActionSteps(newActionSteps);
    setCompletedSteps(newCompletedSteps);

    setShowDropSavePopup(true);
    handleSave(newActionSteps, newCompletedSteps).then(() => {
      setTimeout(() => setShowDropSavePopup(false), 2000);
    });
  };

  const allowDrop = (e) => e.preventDefault();

  const isDirty = () => {
    if (savedSnapshotRef.current === null) return false;
    const current = buildSnapshot(vision, goalDueDate, realityText, notes, actionSteps, completedSteps, manuallyCompleted, chartType);
    return current !== savedSnapshotRef.current;
  };

  // Warn on browser-level exits (tab close, refresh, navigating away) that
  // don't go through handleBackClick and its own unsaved-changes prompt.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  const handleBackClick = () => {
    if (isDirty()) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    setShowExitConfirm(false);
    onBack();
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    onBack();
  };

  const addEmptyStep = () => {
    const newStep = { id: Date.now().toString(), text: "", dueDate: "", offsetDays: null };
    setActionSteps([...actionSteps, newStep]);
  };

  const addStepToCalendar = (step) => {
    if (!step.dueDate || !step.text) return;
    const ics = buildStepICS(step.text, `Action step for goal: ${vision}`, step.dueDate);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={handleBackClick} style={backBtnStyle}>← Back to Dashboard</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={typeSelectStyle}
            title="Chart Area"
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
          {status === "loading" && <span style={{ fontSize: '12px', color: '#999' }}>Loading...</span>}
          {status === "saved" && <span style={{ fontSize: '12px', color: '#28a745' }}>Saved ✓</span>}
          {status === "error" && <span style={{ fontSize: '12px', color: '#dc3545' }}>Error saving</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={manuallyCompleted}
              onChange={(e) => setManuallyCompleted(e.target.checked)}
            />
            Mark Completed
          </label>
          <button onClick={() => handleSave()} disabled={status === "saving"} style={saveBtnStyle}>
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <h2 style={{ color: '#003478', textAlign: 'center', marginBottom: '30px' }}>
        {vision.split('\n')[0].trim() || 'Structural Tension Model'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* --- VISION BLOCK --- */}
        <div style={boxStyle('#28a745')}>
          <label style={labelStyle}>DESIRED FUTURE (VISION)</label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            style={inputStyle}
            placeholder="What is the goal?"
          />
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555', letterSpacing: '0.5px' }}>GOAL DUE DATE</label>
            {isTemplate ? (
              <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                Set when you create a chart from this template
              </span>
            ) : (
              <input
                type="date"
                value={goalDueDate}
                onChange={(e) => setGoalDueDate(e.target.value)}
                style={dateInputStyle}
              />
            )}
          </div>
        </div>

        {/* --- THE TENSION AREA (Active Steps) --- */}
        <div style={connectorContainer}>
          <div style={dashedLine}></div>
          <div style={stepsWrapper}>
            <div style={tensionLabel}>PENDING ACTION STEPS (DRAG DOWN)</div>

            {sortStepsByTiming(actionSteps, isTemplate).map((step) => {
              const index = actionSteps.indexOf(step);
              return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => onDragStart(e, step, index)}
                style={draggableStepStyle}
              >
                <span style={{ marginRight: '10px', color: '#003478', cursor: 'grab' }}>⠿</span>
                <input
                  value={step.text}
                  onChange={(e) => {
                    const newSteps = [...actionSteps];
                    newSteps[index].text = e.target.value;
                    setActionSteps(newSteps);
                  }}
                  placeholder="Enter a task..."
                  style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '14px' }}
                />
                {isTemplate ? (
                  <select
                    value={step.offsetDays ?? ""}
                    onChange={(e) => {
                      const newSteps = [...actionSteps];
                      newSteps[index].offsetDays = e.target.value === "" ? null : Number(e.target.value);
                      setActionSteps(newSteps);
                    }}
                    style={dateInputStyle}
                  >
                    <option value="">No specific timing</option>
                    {OFFSET_OPTIONS.map((opt) => (
                      <option key={opt.days} value={opt.days}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="date"
                      value={step.dueDate || ""}
                      onChange={(e) => {
                        const newSteps = [...actionSteps];
                        newSteps[index].dueDate = e.target.value;
                        setActionSteps(newSteps);
                      }}
                      style={dateInputStyle}
                    />
                    <button
                      onClick={() => addStepToCalendar(step)}
                      disabled={!step.dueDate || !step.text}
                      title={step.dueDate ? "Add to Calendar" : "Set a due date first"}
                      style={{ ...calendarBtnStyle, opacity: (!step.dueDate || !step.text) ? 0.4 : 1, cursor: (!step.dueDate || !step.text) ? 'not-allowed' : 'pointer' }}
                    >
                      📅
                    </button>
                  </>
                )}
              </div>
              );
            })}

            <button onClick={addEmptyStep} style={addBtnStyle}>+ Add Step</button>
          </div>
        </div>

        {/* --- CURRENT REALITY BLOCK (The Drop Zone) --- */}
        <div
          onDragOver={allowDrop}
          onDrop={onDropToReality}
          style={{
            ...boxStyle('#dc3545'),
            minHeight: '150px',
            transition: 'all 0.2s',
            backgroundColor: actionSteps.length > 0 ? '#fff' : '#fcfcfc'
          }}
        >
          <label style={labelStyle}>CURRENT REALITY (COMPLETED ITEMS)</label>
          {showDropSavePopup && (
            <div style={dropSavePopupStyle}>
              {status === "saving" && "Saving..."}
              {status === "saved" && "Saved ✓"}
              {status === "error" && "Error saving — try the Save button above"}
            </div>
          )}
          <textarea
            value={realityText}
            onChange={(e) => setRealityText(e.target.value)}
            style={{ ...inputStyle, minHeight: '40px', fontWeight: 'bold', marginBottom: '10px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedSteps.map((step) => (
              <div key={step.id} style={completedStepStyle}>
                <span style={{ color: '#28a745', marginRight: '8px' }}>✓</span>
                {step.text || "(Empty Task)"}
              </div>
            ))}
            {completedSteps.length === 0 && (
              <div style={{ color: '#999', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', marginTop: '10px', border: '1px dashed #ccc', padding: '10px' }}>
                Drag completed steps here to update your reality
              </div>
            )}
          </div>
        </div>

        <div style={{ ...boxStyle('#6c757d'), marginTop: '24px' }}>
          <label style={labelStyle}>NOTES</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: '140px', lineHeight: 1.5 }}
            placeholder="Keep notes, context, links, and follow-ups for this topic here..."
          />
        </div>

      </div>

      {showExitConfirm && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#333' }}>
              You have unsaved changes. Save before leaving?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowExitConfirm(false)} style={modalCancelBtnStyle}>Cancel</button>
              <button onClick={handleDiscardAndExit} style={modalDiscardBtnStyle}>Discard</button>
              <button onClick={handleSaveAndExit} style={modalSaveBtnStyle}>Save & Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES ---

const boxStyle = (color) => ({
  width: '100%',
  border: `2px solid ${color}`,
  borderRadius: '8px',
  padding: '15px',
  backgroundColor: 'white',
  zIndex: 2,
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
});

const connectorContainer = {
  width: '100%',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  padding: '40px 0'
};

const dashedLine = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: '50%',
  borderLeft: '2px dashed #003478',
  zIndex: 1
};

const stepsWrapper = {
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  width: '80%'
};

const draggableStepStyle = {
  backgroundColor: 'white',
  border: '1px solid #003478',
  borderRadius: '6px',
  padding: '12px',
  width: '100%',
  cursor: 'grab',
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const dropSavePopupStyle = {
  backgroundColor: '#e8f5e9',
  border: '1px solid #28a745',
  color: '#1b5e20',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '13px',
  fontWeight: 'bold',
  marginBottom: '10px',
  textAlign: 'center',
};

const completedStepStyle = {
  backgroundColor: '#f1f3f5',
  borderLeft: '4px solid #28a745',
  padding: '8px 12px',
  fontSize: '14px',
  color: '#666',
  textDecoration: 'line-through'
};

const tensionLabel = {
  backgroundColor: '#003478',
  color: 'white',
  padding: '4px 12px',
  fontSize: '10px',
  fontWeight: 'bold',
  borderRadius: '4px',
  marginBottom: '5px'
};

const addBtnStyle = {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px dashed #003478',
    color: '#003478',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
};

const saveBtnStyle = {
  padding: '8px 16px',
  backgroundColor: '#003478',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold'
};

const backBtnStyle = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  border: '1px solid #ccc',
  color: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalBoxStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '20px 24px',
  minWidth: '320px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
};

const modalCancelBtnStyle = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  border: '1px solid #ccc',
  color: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const modalDiscardBtnStyle = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  border: '1px solid #dc3545',
  color: '#dc3545',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
};

const modalSaveBtnStyle = {
  padding: '8px 14px',
  backgroundColor: '#003478',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
};

const typeSelectStyle = {
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '6px 10px',
  fontSize: '12px',
  color: '#444',
  backgroundColor: '#fff',
};

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#555', letterSpacing: '0.5px' };
const inputStyle = { width: '100%', border: 'none', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: 'transparent' };
const dateInputStyle = { border: '1px solid #ccc', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', fontFamily: 'inherit', color: '#555', flexShrink: 0 };
const calendarBtnStyle = { border: '1px solid #ccc', borderRadius: '4px', padding: '4px 8px', fontSize: '14px', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, marginLeft: '6px' };

export default StructuralTensionChart;
