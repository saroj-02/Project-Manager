import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, LogOut, Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

const socket = io(API_URL);

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/invites`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInvites(data);
        }
      } catch (err) {
        console.error('Error fetching invites:', err);
      }
    };

    fetchInvites();

    if (user && user.username) {
      socket.emit('join-user', user.username);

      socket.on('invite-received', (newInvite) => {
        setInvites(prev => [newInvite, ...prev]);
      });
    }

    return () => {
      socket.off('invite-received');
    };
  }, [user]);

  // Click outside handling
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRespond = async (inviteId, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        if (action === 'accept') {
          const data = await res.json();
          setShowDropdown(false);
          // Redirect to the project board
          navigate(`/project/${data.projectId}`);
        }
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        <span style={{ fontWeight: 'bold', fontSize: '1.25rem', letterSpacing: '-0.025em' }}>Project Manager</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            style={{ position: 'relative', background: 'none', color: 'var(--text-secondary)' }}
          >
            <Bell size={20} />
            {invites.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {invites.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="glass-card animate-fade-in" style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '320px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 999,
              padding: '1rem',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Notifications</h3>
              {invites.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>No pending invitations</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {invites.map(invite => (
                    <div key={invite.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <p style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}>
                        <strong>{invite.sender}</strong> invited you to join project <strong>{invite.projectName}</strong>
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button 
                          onClick={() => handleRespond(invite.id, 'accept')} 
                          className="btn-primary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, borderRadius: '0.25rem' }}
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleRespond(invite.id, 'reject')} 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flex: 1, borderRadius: '0.25rem', background: 'var(--danger)', color: 'white' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
