import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Plus, MessageSquare, User, Users, MoreVertical, ChevronLeft, Calendar, UserPlus, Trash2, X, Shield, Lock } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { useNotification } from '../NotificationContext';
import { API_URL } from '../config';

const socket = io(API_URL);

const PREDEFINED_LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#3b82f6' },
  { name: 'Design', color: '#ec4899' },
  { name: 'High Priority', color: '#f59e0b' },
  { name: 'Documentation', color: '#10b981' }
];

function ProjectBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const showNotification = useNotification();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(null); // columnId
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [showAccessControl, setShowAccessControl] = useState(false);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [projRes, tasksRes] = await Promise.all([
          fetch(`${API_URL}/api/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/api/projects/${projectId}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const projects = await projRes.json();
        const currentProject = projects.find(p => p.id === projectId);
        if (!currentProject) return navigate('/');
        
        setProject(currentProject);
        setTasks(await tasksRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();

    socket.emit('join-project', projectId);

    socket.on('task-created', (newTask) => {
      setTasks(prev => [...prev, newTask]);
      showNotification(`New task created: ${newTask.title}`, 'success');
    });

    socket.on('task-updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
    });

    socket.on('comment-added', ({ taskId, comment }) => {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, comments: [...t.comments, comment] };
        }
        return t;
      }));
      showNotification(`${comment.author} added a comment`, 'info');
    });

    socket.on('member-added', ({ projectId: pid, username }) => {
      if (pid === projectId) {
        setProject(prev => ({ ...prev, members: [...prev.members, username] }));
        showNotification(`${username} joined the project`, 'success');
      }
    });

    socket.on('task-deleted', (taskId) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showNotification('Task deleted', 'info');
    });

    return () => {
      socket.emit('leave-project', projectId);
      socket.off('task-created');
      socket.off('task-updated');
      socket.off('comment-added');
      socket.off('member-added');
      socket.off('task-deleted');
    };
  }, [projectId]);

  const handleCreateTask = async (columnId) => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: newTaskTitle, columnId })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setShowCreateTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTask = async (taskId, newColumnId) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ columnId: newColumnId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        showNotification(errorData.message || "Failed to move task", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error moving task", "error");
    }
  };

  const handleUpdatePermission = async (taskId, username, accessLevel) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username, accessLevel })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t => (t.id === updatedTask.id || t._id === updatedTask._id) ? updatedTask : t));
        showNotification(`Updated permissions for ${username}`, 'success');
      } else {
        const errorData = await res.json();
        showNotification(errorData.message || "Failed to update permissions", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error updating permissions", "error");
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUsername.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/invites`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: newMemberUsername })
      });
      if (res.ok) {
        setNewMemberUsername('');
        setShowAddMember(false);
        showNotification('Invitation sent successfully', 'success');
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="container">Loading board...</div>;
  if (!project) return null;

  return (
    <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1.5rem 2rem', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{project.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} />
              <span>Created {new Date(parseInt(project.id)).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Users size={14} />
              <span>{project.members.length} members</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {project.owner === currentUser.username && (
              <>
                <button onClick={() => setShowAccessControl(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                  <Shield size={16} />
                  Access Control
                </button>
                <button onClick={() => setShowAddMember(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                  <UserPlus size={16} />
                  Add Member
                </button>
                <button onClick={handleDeleteProject} style={{ color: '#ef4444', background: 'none', padding: '0.4rem' }}>
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {showAddMember && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <input 
              placeholder="Enter username..." 
              value={newMemberUsername} 
              onChange={(e) => setNewMemberUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              style={{ flex: 1 }}
            />
            <button onClick={handleAddMember} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Invite</button>
            <button onClick={() => setShowAddMember(false)} style={{ background: 'none', color: 'var(--text-secondary)' }}><X size={18} /></button>
          </div>
        )}
      </header>

      <div style={{ flex: 1, overflowX: 'auto', padding: '1.5rem 2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {project.columns.map(column => (
          <div key={column.id} style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{column.title}</h3>
                <span style={{ padding: '0.125rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: '1rem', fontSize: '0.75rem' }}>
                  {tasks.filter(t => t.columnId === column.id).length}
                </span>
              </div>
              <button onClick={() => setShowCreateTask(column.id)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '100px' }}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => {
                   const taskId = e.dataTransfer.getData('taskId');
                   handleMoveTask(taskId, column.id);
                 }}>
              {tasks.filter(t => t.columnId === column.id).map(task => {
                const userPerm = task.permissions?.find(p => p.username === currentUser.username);
                const isViewOnly = project.owner !== currentUser.username && userPerm && userPerm.accessLevel === 'view-only';
                return (
                  <div 
                    key={task.id || task._id} 
                    draggable={!isViewOnly} 
                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id || task._id)}
                    onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                    className="glass-card" 
                    style={{ 
                      padding: '1rem', 
                      cursor: 'pointer', 
                      transition: 'transform 0.2s',
                      borderColor: 'var(--glass-border)',
                      opacity: isViewOnly ? 0.8 : 1
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    {task.labels && task.labels.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                        {task.labels.map(lName => {
                          const config = PREDEFINED_LABELS.find(p => p.name === lName) || { color: 'var(--accent-primary)' };
                          return (
                            <span key={lName} style={{ 
                              padding: '0.0625rem 0.375rem', 
                              borderRadius: '0.125rem', 
                              fontSize: '0.6875rem', 
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontWeight: '600', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {task.title}
                        {isViewOnly && <Lock size={14} style={{ color: 'var(--text-secondary)' }} />}
                      </h4>
                      <button style={{ background: 'none', color: 'var(--text-secondary)' }}>
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {task.description || 'No description'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {task.comments.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MessageSquare size={12} />
                            <span>{task.comments.length}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            color: new Date(task.dueDate) < new Date() && task.columnId !== 'done' ? 'var(--danger)' : 'var(--text-secondary)'
                          }}>
                            <Calendar size={12} />
                            <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                      {task.assignee && (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold' }}>
                          {task.assignee.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {showCreateTask === column.id ? (
                <div className="glass-card" style={{ padding: '1rem' }}>
                  <input 
                    autoFocus
                    placeholder="Task title..." 
                    value={newTaskTitle} 
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(column.id)}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleCreateTask(column.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Add</button>
                    <button onClick={() => setShowCreateTask(null)} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowCreateTask(column.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.75rem', 
                    background: 'none', 
                    color: 'var(--text-secondary)',
                    borderRadius: '0.5rem',
                    border: '1px dashed var(--glass-border)',
                    fontSize: '0.875rem'
                  }}
                >
                  <Plus size={16} />
                  <span>Add Task</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showTaskModal && (
        <TaskModal 
          task={selectedTask} 
          members={project.members}
          currentUser={currentUser}
          isOwner={project.owner === currentUser.username}
          onClose={() => setShowTaskModal(false)} 
          onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
        />
      )}

      {showAccessControl && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 
        }}>
          <div className="glass-card animate-fade-in" style={{ 
            width: '100%', maxWidth: '800px', maxHeight: '80vh', 
            background: 'var(--bg-secondary)', padding: 0, overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} style={{ color: 'var(--accent-primary)' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Task Access Control</h2>
              </div>
              <button onClick={() => setShowAccessControl(false)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Manage task visibility and edit permissions for each team member. Updates are applied instantly.
              </p>
              
              {project.members.filter(m => m !== project.owner).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No members have joined this project yet. Invite members to manage their permissions.
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No tasks exist in this project yet. Create tasks to configure permissions.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>Task Name</th>
                        {project.members.filter(m => m !== project.owner).map(member => (
                          <th key={member} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600' }}>{member}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(task => (
                        <tr key={task.id || task._id} style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{task.title}</td>
                          {project.members.filter(m => m !== project.owner).map(member => {
                            const currentPerm = task.permissions?.find(p => p.username === member)?.accessLevel || 'allow';
                            return (
                              <td key={member} style={{ padding: '0.75rem 1rem' }}>
                                <select
                                  value={currentPerm}
                                  onChange={(e) => handleUpdatePermission(task.id || task._id, member, e.target.value)}
                                  style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    width: '120px'
                                  }}
                                >
                                  <option value="allow">Full Access</option>
                                  <option value="view-only">View Only</option>
                                  <option value="hidden">Hidden</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <footer style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)' }}>
              <button onClick={() => setShowAccessControl(false)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectBoard;
