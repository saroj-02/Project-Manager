import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, LogOut, User, Bell } from 'lucide-react';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav style={{ 
      padding: '1rem 2rem', 
      background: 'var(--bg-secondary)', 
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <Layout size={20} color="white" />
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '1.25rem', letterSpacing: '-0.025em' }}>Antigravity PM</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{ background: 'none', color: 'var(--text-secondary)' }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'var(--glass)', borderRadius: '2rem', border: '1px solid var(--glass-border)' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user.username}</span>
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'none', 
            color: 'var(--danger)',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
