import React, { useState, useEffect } from 'react';
import { listCharts, deleteChart, getChart, updateChart, createChart } from '../api';
import { offsetFromDates, dateFromOffset } from '../templateOffsets';

const HOUR_MS = 60 * 60 * 1000;

const getTileStatus = (chart) => {
  if (chart.status === 'completed') return 'completed';
  if (!chart.goalDueDate) return 'idea';
  const dueDate = new Date(chart.goalDueDate);
  const overdueMs = Date.now() - dueDate.getTime();
  if (overdueMs > 24 * HOUR_MS) return 'overdue';
  return 'active';
};

const TILE_COLORS = {
  idea: '#f4d35e',       // yellow
  active: '#f4d35e',     // yellow
  overdue: '#c62828',    // red
  completed: '#2e7d32',  // green
};

const TEMPLATE_TILE_COLOR = '#5e4b8a'; // purple, always used for template tiles regardless of status

const AREA_CONFIG = {
  work: {
    title: 'Work Area',
    ribbonColor: '#0b4f8a',
    badgeBg: '#d9ecfb',
    badgeText: '#0b4f8a',
    sectionBorder: '#c7ddf3',
    emptyText: 'No work charts yet.',
    newLabel: '+ New Work Chart',
  },
  personal: {
    title: 'Personal Area',
    ribbonColor: '#8a2f5a',
    badgeBg: '#f9dced',
    badgeText: '#8a2f5a',
    sectionBorder: '#f2c7dc',
    emptyText: 'No personal charts yet.',
    newLabel: '+ New Personal Chart',
  },
  template: {
    title: 'Templates',
    ribbonColor: '#5e4b8a',
    badgeBg: '#eae3f5',
    badgeText: '#5e4b8a',
    sectionBorder: '#dccbee',
    emptyText: 'No templates yet.',
  },
  completed: {
    title: 'Completed',
    ribbonColor: '#2e7d32',
    sectionBorder: '#bfe3c4',
    emptyText: 'No completed charts yet.',
  },
};

const TEMPLATE_SEEDED_KEY_PREFIX = 'stc_template_seeded_';

const buildDefaultTemplate = (ownerId) => ({
  goal: 'Example: Learn a new skill in 90 days',
  goalDate: new Date(),
  goalDueDate: null,
  currentReality: "I haven't studied this topic before and don't know where to start.",
  notes: 'This is a starter template showing how a Structural Tension Chart is put together. Click "Use Template" to create your own chart from this structure, then customize the vision, steps, and reality.',
  currentRealityDate: new Date(),
  status: 'idea',
  chartType: 'work',
  ownerId,
  isTemplate: true,
  steps: [
    { id: 1, text: 'Research the topic and gather learning resources', completed: false, date: new Date(), dueDate: null, offsetDays: 21 },
    { id: 2, text: 'Practice for 30 minutes each day', completed: false, date: new Date(), dueDate: null, offsetDays: 7 },
    { id: 3, text: 'Review progress weekly and adjust the plan', completed: false, date: new Date(), dueDate: null, offsetDays: 1 },
  ],
});

const normalizeChartType = (chart) => chart.chartType === 'personal' ? 'personal' : 'work';

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getTodayActionItems = (charts, todayStr) => {
  const items = [];
  for (const chart of charts) {
    for (const step of chart.steps || []) {
      if (!step.completed && step.dueDate && step.dueDate.slice(0, 10) === todayStr) {
        items.push({
          chartId: chart._id,
          chartType: normalizeChartType(chart),
          chartGoal: chart.goal,
          stepId: step.id,
          stepText: step.text,
        });
      }
    }
  }
  return items;
};

const QUICK_ITEMS_KEY_PREFIX = 'stc_quick_items_';

const loadQuickItems = (ownerId) => {
  try {
    const raw = localStorage.getItem(QUICK_ITEMS_KEY_PREFIX + (ownerId || 'guest'));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load quick action items:", err);
    return [];
  }
};

const saveQuickItems = (ownerId, items) => {
  try {
    localStorage.setItem(QUICK_ITEMS_KEY_PREFIX + (ownerId || 'guest'), JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save quick action items:", err);
  }
};

const Dashboard = ({ onOpenChart, onNewChart, ownerId }) => {
  const [charts, setCharts] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "" | "error"
  const [quickItems, setQuickItems] = useState([]);
  const [newQuickText, setNewQuickText] = useState("");
  const [newQuickDate, setNewQuickDate] = useState("");
  const [banner, setBanner] = useState("");
  const [useTemplateTarget, setUseTemplateTarget] = useState(null);
  const [useTemplateDueDate, setUseTemplateDueDate] = useState("");

  const showBanner = (text) => {
    setBanner(text);
    setTimeout(() => setBanner(""), 2500);
  };

  const load = async () => {
    setStatus("loading");
    try {
      let data = await listCharts(ownerId);
      const seededKey = TEMPLATE_SEEDED_KEY_PREFIX + (ownerId || 'guest');
      if (!data.some((c) => c.isTemplate) && !localStorage.getItem(seededKey)) {
        localStorage.setItem(seededKey, '1');
        try {
          await createChart(buildDefaultTemplate(ownerId));
          data = await listCharts(ownerId);
        } catch (seedErr) {
          console.error("Failed to seed default template:", seedErr);
        }
      }
      setCharts(data);
      setStatus("");
    } catch (err) {
      console.error("Failed to load charts:", err);
      setStatus("error");
    }
  };

  useEffect(() => { load(); }, [ownerId]);
  useEffect(() => { setQuickItems(loadQuickItems(ownerId)); }, [ownerId]);

  const handleAddQuickItem = (e) => {
    e.preventDefault();
    const text = newQuickText.trim();
    if (!text) return;
    const item = { id: Date.now().toString(), text, dueDate: newQuickDate || null, completed: false };
    const updated = [...quickItems, item];
    setQuickItems(updated);
    saveQuickItems(ownerId, updated);
    setNewQuickText("");
    setNewQuickDate("");
  };

  const handleToggleQuickItem = (id) => {
    const updated = quickItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setQuickItems(updated);
    saveQuickItems(ownerId, updated);
  };

  const handleDeleteQuickItem = (id) => {
    const updated = quickItems.filter((item) => item.id !== id);
    setQuickItems(updated);
    saveQuickItems(ownerId, updated);
  };

  const nonTemplateCharts = charts.filter((chart) => !chart.isTemplate);
  const activeCharts = nonTemplateCharts.filter((chart) => chart.status !== 'completed');
  const todayItems = getTodayActionItems(activeCharts, getTodayStr());
  const workCharts = activeCharts.filter((chart) => normalizeChartType(chart) === 'work');
  const personalCharts = activeCharts.filter((chart) => normalizeChartType(chart) === 'personal');
  const completedCharts = nonTemplateCharts.filter((chart) => chart.status === 'completed');
  const templateCharts = charts.filter((chart) => chart.isTemplate);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chart? This cannot be undone.")) return;
    try {
      await deleteChart(id);
      setCharts(charts.filter(c => c._id !== id));
    } catch (err) {
      console.error("Failed to delete chart:", err);
      alert("Failed to delete chart.");
    }
  };

  const handleSaveAsTemplate = async (e, chart) => {
    e.stopPropagation();
    try {
      const full = await getChart(chart._id);
      if (!full) return;
      await createChart({
        goal: full.goal,
        goalDate: new Date(),
        goalDueDate: null,
        currentReality: full.currentReality,
        notes: full.notes,
        currentRealityDate: new Date(),
        status: 'idea',
        chartType: normalizeChartType(full),
        ownerId,
        isTemplate: true,
        steps: (full.steps || []).map(s => ({
          id: s.id,
          text: s.text,
          completed: false,
          date: new Date(),
          dueDate: null,
          offsetDays: offsetFromDates(full.goalDueDate, s.dueDate),
        })),
      });
      showBanner('Saved as template. You can now delete the original chart if you like.');
      load();
    } catch (err) {
      console.error("Failed to save as template:", err);
      alert("Failed to save as template.");
    }
  };

  const handleUseTemplate = (e, template) => {
    e.stopPropagation();
    setUseTemplateTarget(template);
    setUseTemplateDueDate("");
  };

  const closeUseTemplateModal = () => {
    setUseTemplateTarget(null);
    setUseTemplateDueDate("");
  };

  const confirmUseTemplate = async () => {
    try {
      const full = await getChart(useTemplateTarget._id);
      if (!full) return;
      const chartType = normalizeChartType(full);
      const goalDueDate = useTemplateDueDate ? new Date(useTemplateDueDate) : null;
      const created = await createChart({
        goal: full.goal,
        goalDate: new Date(),
        goalDueDate,
        currentReality: full.currentReality,
        notes: full.notes,
        currentRealityDate: new Date(),
        status: 'idea',
        chartType,
        ownerId,
        isTemplate: false,
        steps: (full.steps || []).map(s => ({
          id: s.id,
          text: s.text,
          completed: false,
          date: new Date(),
          dueDate: dateFromOffset(goalDueDate, s.offsetDays),
          offsetDays: null,
        })),
      });
      closeUseTemplateModal();
      onOpenChart({ id: created._id, chartType });
    } catch (err) {
      console.error("Failed to create chart from template:", err);
      alert("Failed to create chart from template.");
    }
  };

  const handleCompleteStep = async (e, item) => {
    e.stopPropagation();
    try {
      const chart = await getChart(item.chartId);
      if (!chart) return;
      const updatedSteps = (chart.steps || []).map(s =>
        s.id === item.stepId ? { ...s, completed: true } : s
      );
      await updateChart(item.chartId, {
        goal: chart.goal,
        goalDate: chart.goalDate,
        goalDueDate: chart.goalDueDate,
        currentReality: chart.currentReality,
        notes: chart.notes,
        currentRealityDate: chart.currentRealityDate,
        status: chart.status,
        ownerId: chart.ownerId,
        steps: updatedSteps,
      });
      load();
    } catch (err) {
      console.error("Failed to complete step:", err);
      alert("Failed to mark step complete.");
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#003478', margin: 0 }}>My Charts</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onNewChart('work')} style={newBtnStyle}>+ Work</button>
          <button onClick={() => onNewChart('personal')} style={{ ...newBtnStyle, backgroundColor: '#8a2f5a' }}>+ Personal</button>
        </div>
      </div>

      {banner && <div style={bannerStyle}>{banner}</div>}

      <div style={quickSectionStyle}>
        <h3 style={{ margin: '0 0 12px', color: '#003478', fontSize: '15px' }}>Quick Action Items</h3>
        <form onSubmit={handleAddQuickItem} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={newQuickText}
            onChange={(e) => setNewQuickText(e.target.value)}
            placeholder="Add a standalone task..."
            style={quickInputStyle}
          />
          <input
            type="date"
            value={newQuickDate}
            onChange={(e) => setNewQuickDate(e.target.value)}
            style={dateInputStyle}
          />
          <button type="submit" style={newBtnStyle}>+ Add</button>
        </form>
        {quickItems.length === 0 ? (
          <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No quick action items yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickItems.map((item) => (
              <div key={item.id} style={todayItemStyle}>
                <div
                  onClick={() => handleToggleQuickItem(item.id)}
                  style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <span style={{ color: item.completed ? '#28a745' : '#ccc', fontSize: '16px' }}>
                    {item.completed ? '✓' : '○'}
                  </span>
                  <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#999' : '#333' }}>
                    {item.text}
                  </span>
                  {item.dueDate && (
                    <span style={{ color: '#999', fontSize: '12px' }}>Due {new Date(item.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
                <button onClick={() => handleDeleteQuickItem(item.id)} style={completeBtnStyle}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {status === "" && todayItems.length > 0 && (
        <div style={todaySectionStyle}>
          <h3 style={{ margin: '0 0 12px', color: '#003478', fontSize: '15px' }}>Today's Action Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayItems.map((item) => (
              <div
                key={`${item.chartId}-${item.stepId}`}
                onClick={() => onOpenChart({ id: item.chartId, chartType: item.chartType })}
                style={todayItemStyle}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>{item.stepText || "(Untitled step)"}</span>
                  <span style={{ color: '#999', fontSize: '12px' }}> — {item.chartGoal ? item.chartGoal.slice(0, 60) : "(Untitled goal)"}</span>
                </div>
                <button
                  onClick={(e) => handleCompleteStep(e, item)}
                  style={completeBtnStyle}
                >
                  ✓ Complete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "loading" && <p style={{ color: '#999' }}>Loading charts...</p>}
      {status === "error" && <p style={{ color: '#dc3545' }}>Failed to load charts. Is stc-api running?</p>}

      {status === "" && nonTemplateCharts.length === 0 && (
        <div style={emptyStateStyle}>
          <p style={{ color: '#999', marginBottom: '15px' }}>No charts yet.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button onClick={() => onNewChart('work')} style={newBtnStyle}>Create Work Chart</button>
            <button onClick={() => onNewChart('personal')} style={{ ...newBtnStyle, backgroundColor: '#8a2f5a' }}>Create Personal Chart</button>
          </div>
        </div>
      )}

      {status === "" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ChartArea
            type="work"
            charts={workCharts}
            config={AREA_CONFIG.work}
            onNewChart={onNewChart}
            onOpenChart={onOpenChart}
            onDelete={handleDelete}
            onSaveAsTemplate={handleSaveAsTemplate}
          />
          <ChartArea
            type="personal"
            charts={personalCharts}
            config={AREA_CONFIG.personal}
            onNewChart={onNewChart}
            onOpenChart={onOpenChart}
            onDelete={handleDelete}
            onSaveAsTemplate={handleSaveAsTemplate}
          />
          <ChartArea
            type="completed"
            charts={completedCharts}
            config={AREA_CONFIG.completed}
            onOpenChart={onOpenChart}
            onDelete={handleDelete}
            onSaveAsTemplate={handleSaveAsTemplate}
            compact
          />
          <ChartArea
            type="template"
            charts={templateCharts}
            config={AREA_CONFIG.template}
            onOpenChart={onOpenChart}
            onDelete={handleDelete}
            onUseTemplate={handleUseTemplate}
          />
        </div>
      )}

      {useTemplateTarget && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
              Create a chart from "{useTemplateTarget.goal ? useTemplateTarget.goal.slice(0, 60) : 'this template'}"
            </p>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#777' }}>
              This template's steps are timed relative to the goal due date (e.g. "2 weeks before").
              Set a goal due date to have those steps automatically get real due dates, or leave it
              blank and fill in dates later.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>GOAL DUE DATE</label>
              <input
                type="date"
                value={useTemplateDueDate}
                onChange={(e) => setUseTemplateDueDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={closeUseTemplateModal} style={modalCancelBtnStyle}>Cancel</button>
              <button onClick={confirmUseTemplate} style={modalSaveBtnStyle}>Create Chart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChartArea = ({ type, charts, config, onNewChart, onOpenChart, onDelete, onSaveAsTemplate, onUseTemplate, compact }) => {
  const isTemplateArea = type === 'template';
  return (
    <section style={{ ...areaSectionStyle, borderColor: config.sectionBorder }}>
      <div style={{ ...areaRibbonStyle, backgroundColor: config.ribbonColor }}>
        {config.title}
      </div>
      {charts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
          <p style={{ color: '#777', marginBottom: '12px' }}>{config.emptyText}</p>
          {!isTemplateArea && config.newLabel && (
            <button onClick={() => onNewChart(type)} style={{ ...newBtnStyle, backgroundColor: config.ribbonColor }}>
              {config.newLabel}
            </button>
          )}
        </div>
      ) : (
        <div style={compact ? compactTileGridStyle : tileGridStyle}>
          {charts.map((chart) => {
            const tileStatus = getTileStatus(chart);
            const bgColor = isTemplateArea ? TEMPLATE_TILE_COLOR : TILE_COLORS[tileStatus];
            const textColor = isTemplateArea ? '#fff' : (tileStatus === 'idea' || tileStatus === 'active' ? '#3a2f00' : '#fff');
            const badgeConfig = isTemplateArea ? config : AREA_CONFIG[normalizeChartType(chart)];
            const badgeLabel = isTemplateArea ? 'Template' : (normalizeChartType(chart) === 'work' ? 'Work' : 'Personal');
            return (
              <div
                key={chart._id}
                onClick={() => onOpenChart({ id: chart._id, chartType: normalizeChartType(chart) })}
                style={{ ...(compact ? compactTileStyle : tileStyle), backgroundColor: bgColor, color: textColor }}
              >
                <span
                  style={{
                    ...(compact ? compactBadgeStyle : typeBadgeStyle),
                    backgroundColor: badgeConfig.badgeBg,
                    color: badgeConfig.badgeText,
                  }}
                >
                  {badgeLabel}
                </span>
                <button
                  onClick={(e) => onDelete(e, chart._id)}
                  style={{ ...(compact ? compactDeleteBtnStyle : deleteBtnStyle), color: textColor, borderColor: textColor }}
                >
                  Delete
                </button>
                <div style={{ fontWeight: 'bold', fontSize: compact ? '13px' : '16px', marginBottom: compact ? '4px' : '10px' }}>
                  {chart.goal ? chart.goal.slice(0, 80) : '(Untitled goal)'}
                </div>
                {!isTemplateArea && !compact && (
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {chart.goalDueDate
                      ? `Due ${new Date(chart.goalDueDate).toLocaleDateString()}`
                      : 'No due date set'}
                  </div>
                )}
                {!compact && (
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '6px', textTransform: 'capitalize' }}>
                    {chart.status || 'idea'}
                  </div>
                )}
                <div style={{ marginTop: compact ? '6px' : '10px' }}>
                  {isTemplateArea ? (
                    <button
                      onClick={(e) => onUseTemplate(e, chart)}
                      style={{ ...(compact ? compactFooterBtnStyle : footerBtnStyle), color: textColor, borderColor: textColor }}
                    >
                      Use Template
                    </button>
                  ) : (
                    <button
                      onClick={(e) => onSaveAsTemplate(e, chart)}
                      style={{ ...(compact ? compactFooterBtnStyle : footerBtnStyle), color: textColor, borderColor: textColor }}
                    >
                      Save as Template
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const newBtnStyle = {
  padding: '10px 18px',
  backgroundColor: '#003478',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
};

const tileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '16px',
};

const compactTileGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: '10px',
};

const areaSectionStyle = {
  border: '1px solid',
  borderRadius: '10px',
  padding: '16px',
  backgroundColor: '#fff',
};

const areaRibbonStyle = {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '14px',
  letterSpacing: '0.4px',
  padding: '8px 12px',
  borderRadius: '6px',
  width: 'fit-content',
  marginBottom: '14px',
};

const tileStyle = {
  position: 'relative',
  borderRadius: '10px',
  padding: '42px 20px 18px',
  cursor: 'pointer',
  minHeight: '130px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
};

const compactTileStyle = {
  ...tileStyle,
  borderRadius: '8px',
  padding: '26px 12px 10px',
  minHeight: '60px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
};

const typeBadgeStyle = {
  position: 'absolute',
  top: '12px',
  left: '12px',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '0.2px',
  borderRadius: '999px',
  padding: '4px 10px',
};

const compactBadgeStyle = {
  ...typeBadgeStyle,
  top: '8px',
  left: '8px',
  fontSize: '9px',
  padding: '2px 7px',
};

const deleteBtnStyle = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  padding: '4px 10px',
  backgroundColor: 'transparent',
  border: '1px solid currentColor',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
};

const compactDeleteBtnStyle = {
  ...deleteBtnStyle,
  top: '8px',
  right: '8px',
  padding: '2px 7px',
  fontSize: '9px',
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
  maxWidth: '420px',
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

const footerBtnStyle = {
  padding: '5px 10px',
  backgroundColor: 'transparent',
  border: '1px solid currentColor',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 'bold',
};

const compactFooterBtnStyle = {
  ...footerBtnStyle,
  padding: '3px 8px',
  fontSize: '9px',
};

const bannerStyle = {
  backgroundColor: '#e8f5e9',
  border: '1px solid #28a745',
  color: '#1b5e20',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const todaySectionStyle = {
  backgroundColor: '#fff8e1',
  border: '1px solid #f4d35e',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '30px',
};

const quickSectionStyle = {
  backgroundColor: '#f5f7fa',
  border: '1px solid #dbe4ee',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '30px',
};

const quickInputStyle = {
  flex: 1,
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '8px 10px',
  fontSize: '13px',
  fontFamily: 'inherit',
};

const dateInputStyle = {
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '8px 10px',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: '#555',
  flexShrink: 0,
};

const todayItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'white',
  border: '1px solid #eee',
  borderRadius: '6px',
  padding: '10px 14px',
  cursor: 'pointer',
  fontSize: '14px',
};

const completeBtnStyle = {
  padding: '6px 12px',
  backgroundColor: 'transparent',
  border: '1px solid #28a745',
  color: '#28a745',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  flexShrink: 0,
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '50px',
  border: '1px dashed #ccc',
  borderRadius: '8px',
};

export default Dashboard;
