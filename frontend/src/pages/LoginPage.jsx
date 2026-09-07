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
      background: 'var(--bg)',
      padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.webp" alt="Logo" style={{ maxWidth: '240px', width: '100%', maxHeight: '65px', objectFit: 'contain', margin: '0 auto 16px', display: 'block' }} />

          <p className="text-secondary mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div style={{
            padding: '12px', background: 'var(--status-blocked-bg)', color: 'var(--status-blocked)',
            borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div>
            <label className="font-medium text-sm mb-1" style={{ display: 'block' }}>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => api.get('/auth/warmup').catch(() => { })}
              required
            />
          </div>

          <div>
            <label className="font-medium text-sm mb-1" style={{ display: 'block' }}>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => api.get('/auth/warmup').catch(() => { })}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-secondary btn-outline" style={{ border: 'none', padding: 0 }}>
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            style={{ padding: '12px', gap: '8px' }}
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Reset Password</h3>
              <button onClick={closeForgot} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {fpError && (
              <div style={{ padding: '12px', background: 'var(--status-blocked-bg)', color: 'var(--status-blocked)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '14px' }}>
                {fpError}
              </div>
            )}
            {fpMessage && (
              <div style={{ padding: '12px', background: 'var(--status-completed-bg)', color: 'var(--status-completed)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '14px' }}>
                {fpMessage}
              </div>
            )}

            {!fpMessage && (
              <form onSubmit={handleForgotSubmit} className="flex-col gap-4">
                {forgotStep === 1 && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Enter your email</label>
                    <input required type="email" className="input" value={fpEmail} onChange={e => setFpEmail(e.target.value)} disabled={fpLoading} />
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Send OTP'}
                    </button>
                  </div>
                )}

                {forgotStep === 2 && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Enter 6-digit OTP from your email</label>
                    <input required className="input" value={fpOtp} onChange={e => setFpOtp(e.target.value)} maxLength={6} disabled={fpLoading} />
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Verify OTP'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={fpLoading || resendTimer > 0}
                        style={{
                          background: 'none', border: 'none',
                          color: (fpLoading || resendTimer > 0) ? 'var(--text-disabled)' : 'var(--brand-600)',
                          fontSize: '14px', cursor: (fpLoading || resendTimer > 0) ? 'not-allowed' : 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {forgotStep === 3 && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-1 block">New Password</label>
                      <input required type="password" className="input" value={fpNewPass} onChange={e => setFpNewPass(e.target.value)} disabled={fpLoading} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                      <input required type="password" className="input" value={fpConfirmPass} onChange={e => setFpConfirmPass(e.target.value)} disabled={fpLoading} />
                    </div>
                    <button type="submit" className="btn btn-primary w-full mt-4" disabled={fpLoading}>
                      {fpLoading ? <div className="dots-loader"><span></span><span></span><span></span></div> : 'Reset Password'}
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
