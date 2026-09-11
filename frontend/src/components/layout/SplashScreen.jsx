import React from 'react';

export const SplashScreen = () => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050507',
      backgroundImage: 'url("/login_hero_waves.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* Dark semi-transparent backdrop overlay matching Login Page */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 0
      }} />

      {/* Main Glassmorphic Splash Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        maxWidth: '400px',
        width: '90%',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderRadius: '26px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        animation: 'splashFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Animated Glow Halo behind logo */}
        <div style={{
          position: 'relative',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0) 70%)',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }} />

          {/* Exact Company Emblem Logo as used in LoginPage.jsx */}
          <img
            src="/oauth-logo-120.png"
            alt="Company Emblem Logo"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
              position: 'relative',
              zIndex: 2,
              animation: 'logoFloat 3s ease-in-out infinite'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
          
          {/* Fallback Logo if image fails */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '22px',
            color: '#111827',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #6366f1 0%, #a855f7 100%)'
            }} />
            <span>Cogie</span>
          </div>
        </div>

        {/* Title / Branding matching Login Page Aesthetics */}
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          color: '#6B7280',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          CODE • INNOVATE • ELEVATE
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', 'DM Serif Display', Georgia, serif",
          fontSize: '28px',
          fontWeight: 600,
          color: '#09090B',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em'
        }}>
          Welcome Back
        </h1>

        <p style={{
          fontSize: '13px',
          color: '#6B7280',
          margin: '0 0 28px 0',
          fontWeight: 400,
          lineHeight: 1.4
        }}>
          Preparing your workspace...
        </p>

        {/* Elegant Animated Progress Loader Bar */}
        <div style={{
          width: '100%',
          maxWidth: '180px',
          height: '4px',
          backgroundColor: '#E5E7EB',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '40%',
            backgroundColor: '#09090B',
            borderRadius: '4px',
            animation: 'loadingSlide 1.4s ease-in-out infinite'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes splashFadeIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.25); opacity: 0.9; }
        }
        @keyframes loadingSlide {
          0% { left: -40%; width: 30%; }
          50% { left: 35%; width: 50%; }
          100% { left: 100%; width: 30%; }
        }
      `}</style>
    </div>
  );
};

