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
      <div className="login-card-container">

        {/* LEFT COLUMN: HERO ART WITH QUOTE TEXT */}
        <div className="login-hero-column" style={{
          position: 'relative',
          borderRadius: '26px',
          overflow: 'hidden',
          backgroundImage: 'url("/login_hero_waves.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '36px 32px',
          boxSizing: 'border-box'
        }}>
          {/* Subtle gradient overlay to ensure text readability */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.65) 100%)',
            zIndex: 1
          }} />

          {/* Top Header: Quote Accent */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'rgba(255, 255, 255, 0.9)',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif"
            }}>
              A WISE QUOTE
            </span>
            <div style={{
              height: '1px',
              width: '75px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)'
            }} />
          </div>

          {/* Bottom Footer Quote & Display Title */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
            <h1 style={{
              fontFamily: "'Playfair Display', 'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(28px, 3.2vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.15,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: '0 0 14px 0',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              CODE,<br />
              INNOVATE,<br />
              ELEVATE
            </h1>
            <p style={{
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.85)',
              margin: 0,
              maxWidth: '300px',
              fontWeight: 400
            }}>
              You can get everything you want if you work hard, trust the process, and stick to the plan.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM FIELDS */}
        <div className="login-form-column" style={{
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

          {/* Company Logo Icon */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src="/oauth-logo-120.png"
              alt="Company Emblem Logo"
              style={{
                width: '48px',
                height: '48px',
                objectFit: 'contain',
                margin: '0 auto',
                display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))'
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
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  height: '44px',
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
                    height: '44px',
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
                height: '46px',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '6px',
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
          </form>
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
