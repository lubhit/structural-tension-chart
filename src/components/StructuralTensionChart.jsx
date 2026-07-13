import React, { useState, useEffect } from 'react';
import { getChart, createChart, updateChart } from '../api';

const StructuralTensionChart = ({ chartId: initialChartId, onBack }) => {
  const [chartId, setChartId] = useState(initialChartId || null);
  const [vision, setVision] = useState("");
  const [goalDueDate, setGoalDueDate] = useState("");
  const [realityText, setRealityText] = useState("");
  const [actionSteps, setActionSteps] = useState([
    { id: '1', text: "", dueDate: "" }
  ]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [manuallyCompleted, setManuallyCompleted] = useState(false);
  const [status, setStatus] = useState(""); // "loading" | "saving" | "saved" | "error" | ""

  // --- LOAD ON MOUNT (only if editing an existing chart) ---
  useEffect(() => {
    if (!initialChartId) return;
    const load = async () => {
      setStatus("loading");
      try {
        const chart = await getChart(initialChartId);
        if (chart) {
          setChartId(chart._id);
          setVision(chart.goal || "");
          setGoalDueDate(chart.goalDueDate ? chart.goalDueDate.slice(0, 10) : "");
          setRealityText(chart.currentReality || "");
          const steps = chart.steps || [];
          setActionSteps(
            steps.filter(s => !s.completed).map(s => ({ id: String(s.id), text: s.text, dueDate: s.dueDate ? s.dueDate.slice(0, 10) : "" }))
          );
          setCompletedSteps(
            steps.filter(s => s.completed).map(s => ({ id: String(s.id), text: s.text, dueDate: s.dueDate ? s.dueDate.slice(0, 10) : "" }))
          );
          setManuallyCompleted(chart.status === 'completed');
        }
        setStatus("");
      } catch (err) {
        console.error("Failed to load chart:", err);
        setStatus("error");
      }
    };
    load();
  }, [initialChartId]);

  // --- SAVE ---
  const handleSave = async () => {
    setStatus("saving");
    const computedStatus = manuallyCompleted
      ? 'completed'
      : (actionSteps.length > 0 ? 'active' : 'idea');
    const payload = {
      goal: vision,
      goalDate: new Date(),
      goalDueDate: goalDueDate ? new Date(goalDueDate) : null,
      currentReality: realityText,
      currentRealityDate: new Date(),
      status: computedStatus,
      steps: [
        ...actionSteps.map(s => ({ id: Number(s.id) || Date.now(), text: s.text, completed: false, date: new Date(), dueDate: s.dueDate ? new Date(s.dueDate) : null })),
        ...completedSteps.map(s => ({ id: Number(s.id) || Date.now(), text: s.text, completed: true, date: new Date(), dueDate: s.dueDate ? new Date(s.dueDate) : null })),
      ],
    };

    try {
      if (chartId) {
        await updateChart(chartId, payload);
      } else {
        const created = await createChart(payload);
        setChartId(created._id);
      }
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

    setActionSteps(actionSteps.filter((_, i) => i !== index));
    setCompletedSteps([...completedSteps, step]);
  };

  const allowDrop = (e) => e.preventDefault();

  const addEmptyStep = () => {
    const newStep = { id: Date.now().toString(), text: "", dueDate: "" };
    setActionSteps([...actionSteps, newStep]);
  };

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={backBtnStyle}>← Back to Dashboard</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <button onClick={handleSave} disabled={status === "saving"} style={saveBtnStyle}>
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <h2 style={{ color: '#003478', textAlign: 'center', marginBottom: '30px' }}>Structural Tension Model</h2>

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
            <input
              type="date"
              value={goalDueDate}
              onChange={(e) => setGoalDueDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        </div>

        {/* --- THE TENSION AREA (Active Steps) --- */}
        <div style={connectorContainer}>
          <div style={dashedLine}></div>
          <div style={stepsWrapper}>
            <div style={tensionLabel}>PENDING ACTION STEPS (DRAG DOWN)</div>

            {actionSteps.map((step, index) => (
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
              </div>
            ))}

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

      </div>
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

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#555', letterSpacing: '0.5px' };
const inputStyle = { width: '100%', border: 'none', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: 'transparent' };
const dateInputStyle = { border: '1px solid #ccc', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', fontFamily: 'inherit', color: '#555', flexShrink: 0 };

export default StructuralTensionChart;
