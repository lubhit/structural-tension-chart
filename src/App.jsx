import React, { useState, useEffect } from 'react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

const StructuralTensionChart = () => {
  const [projectName, setProjectName] = useState("My Strategic Goal");
  const [vision, setVision] = useState("");
  const [reality, setReality] = useState("");
  const [steps, setSteps] = useState([{ id: '1', text: "Sample Action Step" }]);
  const [done, setDone] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('tension-tool-save');
    if (saved) {
      const p = JSON.parse(saved);
      setProjectName(p.projectName); setVision(p.vision); setReality(p.reality);
      setSteps(p.steps); setDone(p.done);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('tension-tool-save', JSON.stringify({ projectName, vision, reality, steps, done }));
    alert("Project saved locally!");
  };

  const onDragStart = (e, step, index) => {
    e.dataTransfer.setData("step", JSON.stringify(step));
    e.dataTransfer.setData("index", index);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const step = JSON.parse(e.dataTransfer.getData("step"));
    const index = parseInt(e.dataTransfer.getData("index"));
    setSteps(steps.filter((_, i) => i !== index));
    setDone([...done, { ...step, date: new Date().toLocaleDateString() }]);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '850px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <input value={projectName} onChange={e => setProjectName(e.target.value)} style={{ fontSize: '26px', fontWeight: 'bold', border: 'none', color: '#003478', outline: 'none', width: '70%' }} />
        <button onClick={handleSave} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
      </header>

      {/* VISION SECTION */}
      <div style={{ border: '2px solid #28a745', padding: '25px', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', letterSpacing: '1px' }}>DESIRED FUTURE (VISION)</label>
        <textarea value={vision} onChange={e => setVision(e.target.value)} placeholder="What is the end goal?" style={{ width: '100%', border: 'none', fontSize: '18px', marginTop: '10px', outline: 'none', resize: 'none' }} />
      </div>

      {/* TENSION LINE & STEPS */}
      <div style={{ padding: '50px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '2px dashed #ccc', zIndex: 0 }}></div>
        <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#003478', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>STRUCTURAL TENSION</div>
          {steps.map((s, i) => (
            <div key={s.id} draggable onDragStart={e => onDragStart(e, s, i)} style={{ backgroundColor: 'white', border: '1px solid #ddd', padding: '15px', width: '80%', borderRadius: '8px', cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <input value={s.text} onChange={e => { const n = [...steps]; n[i].text = e.target.value; setSteps(n); }} style={{ border: 'none', width: '100%', outline: 'none' }} placeholder="Action step..." />
            </div>
          ))}
          <button onClick={() => setSteps([...steps, { id: Date.now().toString(), text: "" }])} style={{ border: '1px dashed #003478', background: 'none', color: '#003478', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>+ Add Action Step</button>
        </div>
      </div>

      {/* REALITY SECTION */}
      <div onDragOver={e => e.preventDefault()} onDrop={onDrop} style={{ border: '2px solid #dc3545', padding: '25px', borderRadius: '12px', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', letterSpacing: '1px' }}>CURRENT REALITY</label>
        <textarea value={reality} onChange={e => setReality(e.target.value)} placeholder="Where are you now?" style={{ width: '100%', border: 'none', fontSize: '18px', marginTop: '10px', outline: 'none', resize: 'none' }} />
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          {done.map(s => <div key={s.id} style={{ color: '#888', textDecoration: 'line-through', fontSize: '14px', marginBottom: '5px' }}>✓ {s.text || "Empty Step"}</div>)}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { instance } = useMsal();
  const login = () => instance.loginPopup(loginRequest).catch(e => console.error(e));
  const logout = () => instance.logoutPopup().catch(e => console.error(e));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'Segoe UI, sans-serif' }}>
      <AuthenticatedTemplate>
        <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 40px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#003478', fontWeight: 'bold', fontSize: '18px' }}>Ford | <span style={{fontWeight: 'normal'}}>Tension Tool</span></span>
          <button onClick={logout} style={{ background: 'none', border: '1px solid #ccc', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Sign Out</button>
        </nav>
        <StructuralTensionChart />
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #003478 0%, #001a3d 100%)' }}>
          <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px' }}>
            <h1 style={{ color: '#003478', marginBottom: '10px' }}>Structural Tension</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Sign in with your Personal Microsoft Account to continue.</p>
            <button onClick={login} style={{ backgroundColor: '#003478', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Login with Microsoft</button>
          </div>
        </div>
      </UnauthenticatedTemplate>
    </div>
  );
}
