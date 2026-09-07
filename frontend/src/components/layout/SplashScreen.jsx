import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show for 300ms, then fade out for 200ms
    const t1 = setTimeout(() => setFade(true), 300);
    const t2 = setTimeout(onFinish, 500);
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
        alt="Logo" 
        style={{ height: '140px', animation: 'pulse 1s infinite' }} 
      />
      
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
