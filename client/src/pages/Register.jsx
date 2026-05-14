import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Mail, Lock, User } from 'lucide-react';

function Register({ onLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--accent-secondary)', borderRadius: '1rem', marginBottom: '1rem' }}>
            <Layout size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Join your team today</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ paddingLeft: '3rem' }}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={{ paddingLeft: '3rem' }}
              required
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ paddingLeft: '3rem' }}
              required
            />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}
          
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-secondary)', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
