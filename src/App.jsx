import React, { useState, useCallback } from 'react';
import StructuralTensionChart from "./components/StructuralTensionChart";
import Dashboard from "./components/Dashboard";
import GoogleLogin from "./components/GoogleLogin";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const USER_STORAGE_KEY = "stc_google_user";

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(loadStoredUser);
  // view: "dashboard" | "chart"
  const [view, setView] = useState("dashboard");
  const [activeChartId, setActiveChartId] = useState(null);

  const handleLogin = useCallback((loggedInUser) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setView("dashboard");
    setActiveChartId(null);
  };

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

  // Login is only enforced once a real Google Client ID is configured.
  // Without one, fall through to the app unauthenticated (old behavior).
  if (!user && GOOGLE_CLIENT_ID) {
    return <GoogleLogin clientId={GOOGLE_CLIENT_ID} onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'Segoe UI, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <span style={{ color: '#003478', fontWeight: 'bold', fontSize: '18px' }}>Structure Tension Charting App</span>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.picture && (
              <img src={user.picture} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            )}
            <span style={{ fontSize: '13px', color: '#555' }}>{user.name || user.email}</span>
            <button onClick={handleSignOut} style={signOutBtnStyle}>Sign Out</button>
          </div>
        )}
      </nav>

      {view === "dashboard" && (
        <Dashboard onOpenChart={openChart} onNewChart={newChart} ownerId={user?.sub} />
      )}
      {view === "chart" && (
        <StructuralTensionChart chartId={activeChartId} onBack={backToDashboard} ownerId={user?.sub} />
      )}
    </div>
  );
}

const signOutBtnStyle = {
  padding: '6px 14px',
  backgroundColor: 'transparent',
  border: '1px solid #ccc',
  color: '#555',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};
