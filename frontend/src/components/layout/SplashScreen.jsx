import React, { useEffect, useState } from 'react';

export const SplashScreen = () => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <img 
        src="/logo.webp" 
        alt="Logo" 
        style={{ maxWidth: '320px', width: '80%', maxHeight: '85px', objectFit: 'contain', animation: 'pulse 1s infinite' }} 
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
