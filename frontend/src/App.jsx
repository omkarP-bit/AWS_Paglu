import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import { HeartPulse, Bell, LogOut } from 'lucide-react';
import axios from 'axios';

function Navigation({ user, handleLogout }) {
  const location = useLocation();
  
  if (!user) return null; // No nav if not logged in
  
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <HeartPulse color="var(--accent-green)" size={28} />
        LifeMatch
      </Link>
      <div className="nav-links">
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginRight: '1rem' }}>
          Role: <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{user.role}</span>
        </span>
        <button onClick={handleLogout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.action === "NEW_ALLOCATION") {
        setNotification(`Match Found! Organ Allocation Confirmed.`);
        setTimeout(() => setNotification(null), 8000);
      }
    };

    return () => ws.close();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <Navigation user={user} handleLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/login" element={!token ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/signup" element={!token ? <Signup setToken={setToken} setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/" element={token ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </div>

      {notification && (
        <div className="notification-toast">
          <Bell color="var(--accent-green)" />
          <span>{notification}</span>
        </div>
      )}
    </Router>
  );
}

export default App;
