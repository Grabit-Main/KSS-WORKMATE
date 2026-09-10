import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { SplashScreen } from '../components/layout/SplashScreen';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showFpPass, setShowFpPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { login } = useAuth();

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: otp, 3: new pass
  const [fpLoading, setFpLoading] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    // Warm up backend container & database connection instantly on mount
    api.get('/auth/warmup').catch(() => { });

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      const msg = err.response?.data?.detail || (err.response?.status ? `Server error (${err.response.status})` : (err.message || 'Login failed'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    if (e) e.preventDefault();
    setFpError('');
    setFpMessage('');
    setFpLoading(true);

    try {
      if (forgotStep === 1) {
        await api.post('/auth/forgot-password', { email: fpEmail });
        setResendTimer(60);
        setForgotStep(2);
      } else if (forgotStep === 2) {
        if (fpOtp.trim().length !== 6) {
          setFpError('Please enter a valid 6-digit OTP code');
          setFpLoading(false);
          return;
        }
        await api.post('/auth/verify-otp', { email: fpEmail, otp: fpOtp.trim() });
        setForgotStep(3);
      } else if (forgotStep === 3) {
        await api.post('/auth/reset-password', {
          email: fpEmail, otp: fpOtp, new_password: fpNewPass, confirm_password: fpConfirmPass
        });
        setFpMessage('Password reset successfully! You can now log in.');
        setTimeout(() => setShowForgot(false), 3000);
      }
    } catch (err) {
      setFpError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setFpError('');
    setFpMessage('');
    setFpLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: fpEmail });
      setResendTimer(60);
      setFpMessage('OTP sent again successfully!');
      setTimeout(() => setFpMessage(''), 3000);
    } catch (err) {
      setFpError(err.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setFpLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep(1);
    setFpEmail('');
    setFpOtp('');
    setFpNewPass('');
    setFpConfirmPass('');
    setFpError('');
    setFpMessage('');
    setResendTimer(0);
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050507',
      backgroundImage: 'url("/login_hero_waves.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dark semi-transparent backdrop overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Outer White Framed Container Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '920px',
        height: 'min(580px, 90vh)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderRadius: '36px',
        backgroundColor: '#FFFFFF',
        padding: '12px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.4)',
        boxSizing: 'border-box',
        margin: 'auto',
        gap: '0px'
      }}>

        {/* LEFT COLUMN: BLANK WITH VISIBLE BACKGROUND IMAGE */}
        <div style={{
          position: 'relative',
          borderRadius: '26px',
          overflow: 'hidden',
          backgroundImage: 'url("/login_hero_waves.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          width: '100%',
          height: '100%'
        }} />

        {/* RIGHT COLUMN: LOGIN FORM FIELDS */}
        <div style={{
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: '0 26px 26px 0',
          position: 'relative',
          zIndex: 2,
          overflowY: 'auto'
        }}>

          {/* Company Logo */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src="/logo.webp"
              alt="Company Logo"
              style={{
                maxWidth: '160px',
                width: '100%',
                maxHeight: '44px',
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
            />
            <div style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '18px',
              color: '#111827'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #6366f1 0%, #a855f7 100%)'
              }} />
              <span>Cogie</span>
            </div>
          </div>

          {/* Welcome Back Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', 'DM Serif Display', Georgia, serif",
              fontSize: '32px',
              fontWeight: 600,
              color: '#09090B',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#6B7280',
              margin: 0,
              fontWeight: 400
            }}>
              Enter your email and password to access your account
            </p>
          </div>

          {/* Error notification banner */}
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #FCA5A5'
            }}>
              {error}
            </div>
          )}

          {/* Form Controls */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px'
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => api.get('/auth/warmup').catch(() => { })}
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid transparent',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#111827',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocusCapture={(e) => {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.borderColor = '#18181B';
                }}
                onBlurCapture={(e) => {
                  e.target.style.backgroundColor = '#F3F4F6';
                  e.target.style.borderColor = 'transparent';
                }}
              />
            </div>

            {/* Password field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => api.get('/auth/warmup').catch(() => { })}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 40px 0 14px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid transparent',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#111827',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocusCapture={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#18181B';
                  }}
                  onBlurCapture={(e) => {
                    e.target.style.backgroundColor = '#F3F4F6';
                    e.target.style.borderColor = 'transparent';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Checkbox and Forgot Password Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#4B5563',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '15px',
                      height: '15px',
                      borderRadius: '4px',
                      accentColor: '#09090B',
                      cursor: 'pointer'
                    }}
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password
                </button>
              </div>
            </div>

            {/* Primary CTA: Sign In */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                transition: 'opacity 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ width: '5px', height: '5px', backgroundColor: '#FFF', borderRadius: '50%', animation: 'bounce 1s infinite 0s' }}></span>
                  <span style={{ width: '5px', height: '5px', backgroundColor: '#FFF', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></span>
                  <span style={{ width: '5px', height: '5px', backgroundColor: '#FFF', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Secondary CTA: Sign In with Google */}
            <button
              type="button"
              onClick={() => setError('Google Sign In is not configured for this environment.')}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google
            </button>
          </form>

          {/* Footer Text */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Don't have an account?{' '}
              <span style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}>
                Sign Up
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            padding: '32px 28px',
            borderRadius: '24px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                  Reset Password
                </h3>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  We'll help you regain account access
                </p>
              </div>
              <button
                onClick={closeForgot}
                style={{
                  background: '#F3F4F6',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  color: '#4B5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {fpError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #FCA5A5' }}>
                {fpError}
              </div>
            )}
            {fpMessage && (
              <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #A7F3D0' }}>
                {fpMessage}
              </div>
            )}

            {!fpMessage && (
              <form onSubmit={handleForgotSubmit}>
                {forgotStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Enter your registered email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="Enter your email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      disabled={fpLoading}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 14px',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid transparent',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        marginTop: '20px',
                        width: '100%',
                        height: '44px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: fpLoading ? 'not-allowed' : 'pointer'
                      }}
                      disabled={fpLoading}
                    >
                      {fpLoading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                  </div>
                )}

                {forgotStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                      Enter 6-digit OTP code sent to your email
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="_ _ _ _ _ _"
                      style={{
                        letterSpacing: '8px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        height: '48px',
                        width: '100%',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid transparent',
                        borderRadius: '10px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      value={fpOtp}
                      onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={fpLoading}
                    />
                    <button
                      type="submit"
                      style={{
                        marginTop: '20px',
                        width: '100%',
                        height: '44px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: fpLoading ? 'not-allowed' : 'pointer'
                      }}
                      disabled={fpLoading || fpOtp.trim().length !== 6}
                    >
                      {fpLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={fpLoading || resendTimer > 0}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: (fpLoading || resendTimer > 0) ? '#9CA3AF' : '#2563EB',
                          fontSize: '13px',
                          cursor: (fpLoading || resendTimer > 0) ? 'not-allowed' : 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                      </button>
                    </div>
                  </div>
                )}

                {forgotStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
                        New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          required
                          type={showFpPass ? 'text' : 'password'}
                          placeholder="Enter New Password"
                          style={{
                            width: '100%',
                            height: '44px',
                            padding: '0 42px 0 14px',
                            backgroundColor: '#F3F4F6',
                            border: '1px solid transparent',
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: '#111827',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          value={fpNewPass}
                          onChange={e => setFpNewPass(e.target.value)}
                          disabled={fpLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowFpPass(!showFpPass)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#9CA3AF'
                          }}
                        >
                          {showFpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
                        Confirm New Password
                      </label>
                      <input
                        required
                        type={showFpPass ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 14px',
                          backgroundColor: '#F3F4F6',
                          border: '1px solid transparent',
                          borderRadius: '10px',
                          fontSize: '14px',
                          color: '#111827',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        value={fpConfirmPass}
                        onChange={e => setFpConfirmPass(e.target.value)}
                        disabled={fpLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        height: '44px',
                        backgroundColor: '#09090B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: fpLoading ? 'not-allowed' : 'pointer'
                      }}
                      disabled={fpLoading}
                    >
                      {fpLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
