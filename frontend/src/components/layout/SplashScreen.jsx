import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show for 1.5s, then fade out for 0.5s
    const t1 = setTimeout(() => setFade(true), 1500);
    const t2 = setTimeout(onFinish, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, transition: 'opacity 0.5s', opacity: fade ? 0 : 1
    }}>
      <img 
        src="/logo.webp" 
        alt="Workmate" 
        style={{ height: '80px', marginBottom: '24px', animation: 'pulse 2s infinite' }} 
      />
      <h1 className="font-bold text-2xl" style={{ color: 'var(--brand-600)' }}>Workmate</h1>
      <p className="text-secondary mt-2">Work Together. Grow Further.</p>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
