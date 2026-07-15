import React, { useEffect, useRef } from 'react';

const GIS_SRC = "https://accounts.google.com/gsi/client";

function decodeJwtPayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

const loadGisScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve();
  const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
  if (existing) {
    existing.addEventListener('load', () => resolve());
    existing.addEventListener('error', reject);
    return;
  }
  const script = document.createElement('script');
  script.src = GIS_SRC;
  script.async = true;
  script.defer = true;
  script.onload = () => resolve();
  script.onerror = reject;
  document.head.appendChild(script);
});

const GoogleLogin = ({ clientId, onLogin }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    loadGisScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const payload = decodeJwtPayload(response.credential);
          onLogin({
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          });
        },
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
      }
    }).catch((err) => {
      console.error("Failed to load Google Sign-In:", err);
    });

    return () => { cancelled = true; };
  }, [clientId, onLogin]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #003478 0%, #001a3d 100%)' }}>
      <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px' }}>
        <h1 style={{ color: '#003478', marginBottom: '10px' }}>Structure Tension Charting App</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Sign in with Google to continue.</p>
        <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />
        {!clientId && (
          <p style={{ color: '#dc3545', fontSize: '12px', marginTop: '20px' }}>
            Missing VITE_GOOGLE_CLIENT_ID — sign-in button won't appear.
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleLogin;
