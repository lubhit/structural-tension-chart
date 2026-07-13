import React, { useState, useEffect } from 'react';
import { listCharts, deleteChart } from '../api';

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
  active: '#2e7d32',     // green
  overdue: '#c62828',    // red
  completed: '#4e342e',  // dark brown
};

const Dashboard = ({ onOpenChart, onNewChart }) => {
  const [charts, setCharts] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "" | "error"

  const load = async () => {
    setStatus("loading");
    try {
      const data = await listCharts();
      setCharts(data);
      setStatus("");
    } catch (err) {
      console.error("Failed to load charts:", err);
      setStatus("error");
    }
  };

  useEffect(() => { load(); }, []);

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

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#003478', margin: 0 }}>My Charts</h2>
        <button onClick={onNewChart} style={newBtnStyle}>+ New Chart</button>
      </div>

      {status === "loading" && <p style={{ color: '#999' }}>Loading charts...</p>}
      {status === "error" && <p style={{ color: '#dc3545' }}>Failed to load charts. Is stc-api running?</p>}

      {status === "" && charts.length === 0 && (
        <div style={emptyStateStyle}>
          <p style={{ color: '#999', marginBottom: '15px' }}>No charts yet.</p>
          <button onClick={onNewChart} style={newBtnStyle}>Create your first chart</button>
        </div>
      )}

      <div style={tileGridStyle}>
        {charts.map(chart => {
          const tileStatus = getTileStatus(chart);
          const bgColor = TILE_COLORS[tileStatus];
          const textColor = tileStatus === 'idea' ? '#3a2f00' : '#fff';
          return (
            <div
              key={chart._id}
              onClick={() => onOpenChart(chart._id)}
              style={{ ...tileStyle, backgroundColor: bgColor, color: textColor }}
            >
              <button
                onClick={(e) => handleDelete(e, chart._id)}
                style={{ ...deleteBtnStyle, color: textColor, borderColor: textColor }}
              >
                Delete
              </button>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>
                {chart.goal ? chart.goal.slice(0, 80) : "(Untitled goal)"}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {chart.goalDueDate
                  ? `Due ${new Date(chart.goalDueDate).toLocaleDateString()}`
                  : "No due date set"}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '6px', textTransform: 'capitalize' }}>
                {chart.status || 'idea'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

const tileStyle = {
  position: 'relative',
  borderRadius: '10px',
  padding: '18px 20px',
  cursor: 'pointer',
  minHeight: '130px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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

const emptyStateStyle = {
  textAlign: 'center',
  padding: '50px',
  border: '1px dashed #ccc',
  borderRadius: '8px',
};

export default Dashboard;
