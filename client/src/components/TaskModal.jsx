import React, { useState } from 'react';
import { X, User, MessageSquare, Send, Calendar, Tag, AlignLeft, Trash2, ChevronDown } from 'lucide-react';

function TaskModal({ task: initialTask, onClose, members = [] }) {
  const [task, setTask] = useState(initialTask);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const handleUpdate = async (updates) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: comment })
      });
      if (res.ok) {
        setComment('');
        // Socket will update the UI, but we can also update local state for immediate feedback
        const newComment = await res.json();
        setTask(prev => ({ ...prev, comments: [...prev.comments, newComment] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 
    }}>
      <div className="glass-card animate-fade-in" style={{ 
        width: '100%', maxWidth: '800px', maxHeight: '90vh', 
        background: 'var(--bg-secondary)', padding: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{task.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleDelete} style={{ background: 'none', color: '#ef4444' }}>
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)' }}>
              <X size={24} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <AlignLeft size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Description</h3>
              </div>
              <textarea 
                value={task.description || ''} 
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                onBlur={() => handleUpdate({ description: task.description })}
                placeholder="Add a more detailed description..."
                style={{ background: 'rgba(0,0,0,0.2)', border: 'none', minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <MessageSquare size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Comments</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {task.comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>
                      {c.author.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{c.author}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>
                  ?
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    placeholder="Write a comment..." 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="submit" disabled={loading} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--accent-primary)' }}>
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Suggested</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'left' }}>
                  <User size={14} /> Join Task
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'left' }}>
                  <Calendar size={14} /> Dates
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'left' }}>
                  <Tag size={14} /> Labels
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Assignee</span>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={task.assignee || ''} 
                      onChange={(e) => handleUpdate({ assignee: e.target.value })}
                      style={{ 
                        appearance: 'none',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem 2rem 0.5rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Status</span>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: 'var(--accent-primary)', borderRadius: '1rem', fontSize: '0.75rem' }}>{task.columnId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;
