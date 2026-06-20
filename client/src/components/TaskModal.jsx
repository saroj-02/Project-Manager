import React, { useState } from 'react';
import { X, User, MessageSquare, Send, Calendar, Tag, AlignLeft, Trash2, ChevronDown } from 'lucide-react';
import { API_URL } from '../config';

const PREDEFINED_LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#3b82f6' },
  { name: 'Design', color: '#ec4899' },
  { name: 'High Priority', color: '#f59e0b' },
  { name: 'Documentation', color: '#10b981' }
];

function TaskModal({ task: initialTask, onClose, members = [], currentUser = {}, isOwner, onUpdate }) {
  const [task, setTask] = useState(initialTask);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLabelPopover, setShowLabelPopover] = useState(false);

  const userPermission = task.permissions?.find(p => p.username === currentUser.username);
  const isViewOnly = !isOwner && userPermission && userPermission.accessLevel === 'view-only';

  React.useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const handleUpdate = async (updates) => {
    const taskId = task.id || task._id;
    console.log("handleUpdate called, taskId:", taskId, "updates:", updates);
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update task");
      }
      const data = await res.json();
      setTask(data);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      console.error("handleUpdate error:", err);
    }
  };

  const handleJoinTask = () => {
    console.log("handleJoinTask called, currentUser:", currentUser);
    if (currentUser && currentUser.username) {
      handleUpdate({ assignee: currentUser.username });
    } else {
      console.error("handleJoinTask failed: currentUser or username is undefined", currentUser);
    }
  };

  const handleToggleLabel = (labelName) => {
    const currentLabels = task.labels || [];
    let newLabels;
    if (currentLabels.includes(labelName)) {
      newLabels = currentLabels.filter(l => l !== labelName);
    } else {
      newLabels = [...currentLabels, labelName];
    }
    handleUpdate({ labels: newLabels });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const taskId = task.id || task._id;
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
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
      const taskId = task.id || task._id;
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: comment })
      });
      if (res.ok) {
        setComment('');
        const newComment = await res.json();
        const updatedTask = { ...task, comments: [...task.comments, newComment] };
        setTask(updatedTask);
        if (onUpdate) onUpdate(updatedTask);
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
        <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{task.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {!isViewOnly && (
                <button onClick={handleDelete} style={{ background: 'none', color: '#ef4444' }}>
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
          </div>
          {task.labels && task.labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {task.labels.map(lName => {
                const config = PREDEFINED_LABELS.find(p => p.name === lName) || { color: 'var(--accent-primary)' };
                return (
                  <span key={lName} style={{ 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    background: `${config.color}20`,
                    color: config.color,
                    border: `1px solid ${config.color}40`
                  }}>
                    {lName}
                  </span>
                );
              })}
            </div>
          )}
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isViewOnly && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderLeft: '4px solid var(--danger)', padding: '0.75rem 1rem', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.5rem', borderRadius: '0 0.5rem 0.5rem 0' }}>
              You have View-Only access to this task. Changes cannot be made.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
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
                disabled={isViewOnly}
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
                    placeholder={isViewOnly ? "Comments are disabled for view-only users" : "Write a comment..."} 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    style={{ paddingRight: '3rem' }}
                    disabled={isViewOnly}
                  />
                  <button type="submit" disabled={loading || isViewOnly} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', color: isViewOnly ? 'var(--text-secondary)' : 'var(--accent-primary)' }}>
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
                <button 
                  onClick={handleJoinTask}
                  disabled={isViewOnly}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: isViewOnly ? 'var(--text-secondary)' : 'var(--text-primary)', textAlign: 'left', width: '100%', cursor: isViewOnly ? 'not-allowed' : 'pointer', opacity: isViewOnly ? 0.5 : 1 }}
                >
                  <User size={14} /> Join Task
                </button>
                <button 
                  onClick={() => document.getElementById('task-due-date-input')?.focus() || document.getElementById('task-due-date-input')?.showPicker?.()}
                  disabled={isViewOnly}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: isViewOnly ? 'var(--text-secondary)' : 'var(--text-primary)', textAlign: 'left', width: '100%', cursor: isViewOnly ? 'not-allowed' : 'pointer', opacity: isViewOnly ? 0.5 : 1 }}
                >
                  <Calendar size={14} /> Dates
                </button>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowLabelPopover(!showLabelPopover)}
                    disabled={isViewOnly}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.25rem', fontSize: '0.875rem', color: isViewOnly ? 'var(--text-secondary)' : 'var(--text-primary)', textAlign: 'left', width: '100%', cursor: isViewOnly ? 'not-allowed' : 'pointer', opacity: isViewOnly ? 0.5 : 1 }}
                  >
                    <Tag size={14} /> Labels
                  </button>
                  {showLabelPopover && (
                    <div className="glass-card" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: '200px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 2010,
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Toggle Labels</span>
                      {PREDEFINED_LABELS.map(l => {
                        const isChecked = task.labels?.includes(l.name);
                        return (
                          <label key={l.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleLabel(l.name)}
                              style={{ width: 'auto', cursor: 'pointer' }}
                            />
                            <span style={{ 
                              padding: '0.125rem 0.375rem', 
                              borderRadius: '0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: '600',
                              background: l.color, 
                              color: 'white' 
                            }}>
                              {l.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                      disabled={isViewOnly}
                      style={{ 
                        appearance: 'none',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem 2rem 0.5rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        cursor: isViewOnly ? 'not-allowed' : 'pointer',
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
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={task.columnId || 'todo'} 
                      onChange={(e) => handleUpdate({ columnId: e.target.value })}
                      disabled={isViewOnly}
                      style={{ 
                        appearance: 'none',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem 2rem 0.5rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        cursor: isViewOnly ? 'not-allowed' : 'pointer',
                        width: '100%'
                      }}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                  </div>
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Due Date</span>
                  <input 
                    type="date"
                    id="task-due-date-input"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={(e) => handleUpdate({ dueDate: e.target.value || null })}
                    disabled={isViewOnly}
                    style={{ 
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      cursor: isViewOnly ? 'not-allowed' : 'pointer',
                      width: '100%'
                    }}
                  />
                </div>
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
