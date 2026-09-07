import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import api from '../api/axios';
import { SplashScreen } from '../components/layout/SplashScreen';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.data?.detail || 'Login failed');
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
        await api.post('/auth/verify-otp', { email: fpEmail, otp: fpOtp });
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
              margin: '0 auto 16px',
              display: 'block',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))'
            }}
          />
          <h2 className="text-xl font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Welcome to Workmate
          </h2>
          <p className="text-secondary text-sm mt-1">Sign in with your organization credentials</p>
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
            <label className="text-xs font-semibold text-secondary mb-1.5" style={{ display: 'block' }}>Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="name@kalpanaaasoftwaresolutions.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => api.get('/auth/warmup').catch(() => { })}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="text-xs font-semibold text-secondary" style={{ display: 'block' }}>Password</label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-medium"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-600)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => api.get('/auth/warmup').catch(() => { })}
              required
            />
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
              'Sign in to Workspace'
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
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-float)',
            background: 'var(--surface)',
            border: '1px solid var(--border)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>Reset Password</h3>
                <p className="text-xs text-secondary mt-0.5">We'll help you regain account access</p>
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
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {fpError && (
              <div style={{ padding: '10px 14px', background: 'var(--status-blocked-bg)', color: 'var(--status-blocked)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
                {fpError}
              </div>
            )}
            {fpMessage && (
              <div style={{ padding: '10px 14px', background: 'var(--status-completed-bg)', color: 'var(--status-completed)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
                {fpMessage}
              </div>
            )}

            {!fpMessage && (
              <form onSubmit={handleForgotSubmit} className="flex-col gap-4">
                {forgotStep === 1 && (
                  <div>
                    <label className="text-xs font-semibold text-secondary mb-1.5 block">Enter your registered email</label>
                    <input required type="email" className="input" placeholder="name@kalpanaaasoftwaresolutions.in" value={fpEmail} onChange={e => setFpEmail(e.target.value)} disabled={fpLoading} />
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Send Reset Code'}
                    </button>
                  </div>
                )}

                {forgotStep === 2 && (
                  <div>
                    <label className="text-xs font-semibold text-secondary mb-1.5 block">Enter 6-digit OTP code sent to your email</label>
                    <input required className="input" placeholder="123456" style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 700 }} value={fpOtp} onChange={e => setFpOtp(e.target.value)} maxLength={6} disabled={fpLoading} />
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Verify Code'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
                  <>
                    <div>
                      <label className="text-xs font-semibold text-secondary mb-1.5 block">New Password</label>
                      <input required type="password" className="input" placeholder="••••••••" value={fpNewPass} onChange={e => setFpNewPass(e.target.value)} disabled={fpLoading} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-secondary mb-1.5 block">Confirm New Password</label>
                      <input required type="password" className="input" placeholder="••••••••" value={fpConfirmPass} onChange={e => setFpConfirmPass(e.target.value)} disabled={fpLoading} />
                    </div>
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Update Password'}
                    </button>
                  </>
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
