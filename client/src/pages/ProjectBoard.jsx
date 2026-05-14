import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Plus, MessageSquare, User, Users, MoreVertical, ChevronLeft, Calendar, UserPlus, Trash2, X } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { useNotification } from '../NotificationContext';

const socket = io('http://localhost:5000');

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

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [projRes, tasksRes] = await Promise.all([
          fetch(`http://localhost:5000/api/projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
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
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, {
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
      await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ columnId: newColumnId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUsername.trim()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/members`, {
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
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
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
              {tasks.filter(t => t.columnId === column.id).map(task => (
                <div 
                  key={task.id} 
                  draggable 
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                  onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                  className="glass-card" 
                  style={{ 
                    padding: '1rem', 
                    cursor: 'pointer', 
                    transition: 'transform 0.2s',
                    borderColor: 'var(--glass-border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{task.title}</h4>
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
                    </div>
                    {task.assignee && (
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold' }}>
                        {task.assignee.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}

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
          onClose={() => setShowTaskModal(false)} 
          onUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
        />
      )}
    </div>
  );
}

export default ProjectBoard;
