import React, { useState } from 'react';
import StructuralTensionChart from "./components/StructuralTensionChart";
import Dashboard from "./components/Dashboard";

export default function App() {
  // view: "dashboard" | "chart"
  const [view, setView] = useState("dashboard");
  const [activeChartId, setActiveChartId] = useState(null);

  const openChart = (id) => {
    setActiveChartId(id);
    setView("chart");
  };

  const newChart = () => {
    setActiveChartId(null); // null = unsaved new chart
    setView("chart");
  };

  const backToDashboard = () => {
    setView("dashboard");
    setActiveChartId(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'Segoe UI, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 40px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <span style={{ color: '#003478', fontWeight: 'bold', fontSize: '18px' }}>Structure Tension Charting App</span>
      </nav>

      {view === "dashboard" && (
        <Dashboard onOpenChart={openChart} onNewChart={newChart} />
      )}
      {view === "chart" && (
        <StructuralTensionChart chartId={activeChartId} onBack={backToDashboard} />
      )}
    </div>
  );
}
