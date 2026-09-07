import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.webp" alt="Logo" style={{ height: '80px', marginBottom: '16px' }} />
          <h2 className="font-bold text-2xl">Welcome back</h2>
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
              required
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-sm">Password</label>
              <button type="button" className="text-xs text-secondary btn-outline" style={{ border: 'none', padding: 0 }}>
                Forgot password?
              </button>
            </div>
            <input 
              type="password" 
              className="input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            style={{ padding: '12px', gap: '8px' }}
            disabled={loading}
          >
            <LogIn size={20} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
