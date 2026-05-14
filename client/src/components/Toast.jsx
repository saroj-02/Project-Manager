import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={18} color="#10b981" />,
    error: <AlertCircle size={18} color="#ef4444" />,
    info: <Info size={18} color="#6366f1" />
  };

  return (
    <div className="glass-card animate-slide-in" style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: 9999,
      background: 'rgba(30, 41, 59, 0.9)',
      minWidth: '300px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      borderLeft: `4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'}`
    }}>
      {icons[type]}
      <span style={{ fontSize: '0.875rem', fontWeight: '500', flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)' }}>
        <X size={16} />
      </button>
    </div>
  );
}

export default Toast;
