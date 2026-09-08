import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { SplashScreen } from '../components/layout/SplashScreen';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await login(email, password);
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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-gradient)',
      padding: '24px'
    }}>
      <div className="card modal-animate" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '36px',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/logo.webp"
            alt="Logo"
            style={{
              maxWidth: '220px',
              width: '100%',
              maxHeight: '60px',
              objectFit: 'contain',
              margin: '0 auto 12px',
              display: 'block',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))'
            }}
          />
          <p className="text-secondary text-sm">Sign in with your organization credentials</p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--status-blocked-bg)',
            color: 'var(--status-blocked)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5" style={{ display: 'block' }}>Email</label>
            <input
              type="email"
              className="input"
              placeholder="Enter Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => api.get('/auth/warmup').catch(() => { })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5" style={{ display: 'block' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Enter Your Password"
                style={{ paddingRight: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => api.get('/auth/warmup').catch(() => { })}
                required
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
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-medium"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-600)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-700)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--brand-600)'}
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}
            disabled={loading}
          >
            {loading ? (
              <div className="dots-loader"><span></span><span></span><span></span></div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>

      {showForgot && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '32px 28px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-float)',
            background: 'var(--surface)',
            border: '1px solid var(--border)'
          }}>
            <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Reset Password
                </h3>
                <p className="text-xs text-secondary" style={{ lineHeight: 1.4 }}>
                  We'll help you regain account access
                </p>
              </div>
              <button
                onClick={closeForgot}
                style={{
                  background: 'var(--subtle)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {fpError && (
              <div style={{ padding: '10px 14px', background: 'var(--status-blocked-bg)', color: 'var(--status-blocked)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px' }}>
                {fpError}
              </div>
            )}
            {fpMessage && (
              <div style={{ padding: '10px 14px', background: 'var(--status-completed-bg)', color: 'var(--status-completed)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px' }}>
                {fpMessage}
              </div>
            )}

            {!fpMessage && (
              <form onSubmit={handleForgotSubmit}>
                {forgotStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="text-xs font-semibold text-secondary block" style={{ marginBottom: '6px' }}>
                      Enter your registered email
                    </label>
                    <input
                      required
                      type="email"
                      className="input"
                      placeholder="Enter Your Email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      disabled={fpLoading}
                      style={{ width: '100%', height: '42px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      style={{ marginTop: '20px', padding: '12px', fontSize: '14px', fontWeight: 600, height: '44px' }}
                      disabled={fpLoading}
                    >
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Send Reset Code'}
                    </button>
                  </div>
                )}

                {forgotStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="text-xs font-semibold text-secondary block" style={{ marginBottom: '6px' }}>
                      Enter 6-digit OTP code sent to your email
                    </label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="_ _ _ _ _ _"
                      style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', height: '46px', width: '100%' }}
                      value={fpOtp}
                      onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={fpLoading}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      style={{ marginTop: '20px', padding: '12px', fontSize: '14px', fontWeight: 600, height: '44px' }}
                      disabled={fpLoading || fpOtp.trim().length !== 6}
                    >
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Verify Code'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '18px' }}>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={fpLoading || resendTimer > 0}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: (fpLoading || resendTimer > 0) ? 'var(--text-disabled)' : 'var(--brand-600)',
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
                      <label className="text-xs font-semibold text-secondary block" style={{ marginBottom: '6px' }}>
                        New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          required
                          type={showFpPass ? 'text' : 'password'}
                          className="input"
                          placeholder="Enter New Password"
                          style={{ paddingRight: '42px', height: '42px', width: '100%' }}
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
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          aria-label={showFpPass ? "Hide password" : "Show password"}
                        >
                          {showFpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-secondary block" style={{ marginBottom: '6px' }}>
                        Confirm New Password
                      </label>
                      <input
                        required
                        type={showFpPass ? 'text' : 'password'}
                        className="input"
                        placeholder="Confirm New Password"
                        style={{ height: '42px', width: '100%' }}
                        value={fpConfirmPass}
                        onChange={e => setFpConfirmPass(e.target.value)}
                        disabled={fpLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      style={{ marginTop: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, height: '44px' }}
                      disabled={fpLoading}
                    >
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Update Password'}
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
