import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Home from './components/Home';
import AdminDashboard from './components/AdminDashboard';
import DonorDashboard from './components/DonorDashboard';
import RecipientDashboard from './components/RecipientDashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import { HeartPulse, Bell, LogOut } from 'lucide-react';
import axios from 'axios';

function Navigation({ user, handleLogout }) {
  const location = useLocation();
  
  if (!user) return null; // No nav if not logged in
  
  return (
    <nav className="navbar" style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
      <Link to="/" className="brand" style={{ color: 'var(--accent-green)', letterSpacing: '-0.75px', fontSize: '1.75rem' }}>
        <HeartPulse color="var(--accent-green)" size={32} />
        LifeMatch
      </Link>
      <div className="nav-links">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {user.role} Dashboard
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {user.email}
          </span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '9999px' }}>
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

  const getDashboard = () => {
    if (!token) return <Home />;
    if (user?.role === 'admin') return <AdminDashboard user={user} />;
    if (user?.role === 'donor') return <DonorDashboard user={user} />;
    if (user?.role === 'recipient') return <RecipientDashboard user={user} />;
    return <Home />;
  };

  return (
    <Router>
      <Navigation user={user} handleLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/login" element={!token ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/signup" element={!token ? <Signup setToken={setToken} setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/" element={getDashboard()} />
        </Routes>
      </div>

      <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <HeartPulse size={20} color="var(--accent-green)" />
          <span style={{ fontWeight: 'bold', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>LifeMatch Systems Inc.</span>
        </div>
        <p style={{ fontSize: '0.875rem' }}>Deterministic algorithmic medical routing.</p>
      </footer>

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
