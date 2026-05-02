import React, { useState } from 'react';

const StructuralTensionChart = () => {
  // 1. State for the Vision and Reality text
  const [vision, setVision] = useState("A fully automated data pipeline");
  const [realityText, setRealityText] = useState("Manual Excel uploads and email chains");
  
  // 2. State for steps in progress (The Tension)
  const [actionSteps, setActionSteps] = useState([
    { id: '1', text: "Define data schema and sources" },
    { id: '2', text: "Set up cloud storage (S3/GCS)" },
    { id: '3', text: "Configure API Authentication" }
  ]);

  // 3. State for finished steps (The Reality)
  const [completedSteps, setCompletedSteps] = useState([]);

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

    // Remove from active steps and add to completed list
    setActionSteps(actionSteps.filter((_, i) => i !== index));
    setCompletedSteps([...completedSteps, step]);
  };

  const allowDrop = (e) => e.preventDefault();

  const addEmptyStep = () => {
    const newStep = { id: Date.now().toString(), text: "" };
    setActionSteps([...actionSteps, newStep]);
  };

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#003478', textAlign: 'center', marginBottom: '40px' }}>Structural Tension Model</h2>
      
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

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#555', letterSpacing: '0.5px' };
const inputStyle = { width: '100%', border: 'none', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: 'transparent' };

export default StructuralTensionChart;
