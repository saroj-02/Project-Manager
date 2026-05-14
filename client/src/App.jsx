import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const login = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <NotificationProvider>
      <Router>
        <div className="app-container">
          {user && <Navbar user={user} onLogout={logout} />}
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/project/:projectId" element={user ? <ProjectBoard /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;
