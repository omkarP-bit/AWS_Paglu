import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AddDonor from './components/AddDonor';
import AddRecipient from './components/AddRecipient';
import { HeartPulse, Bell } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <HeartPulse color="#ef4444" size={28} />
        LifeMatch
      </Link>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
        <Link to="/add-donor" className={`nav-link ${location.pathname === '/add-donor' ? 'active' : ''}`}>Register Donor</Link>
        <Link to="/add-recipient" className={`nav-link ${location.pathname === '/add-recipient' ? 'active' : ''}`}>Waitlist Recipient</Link>
      </div>
    </nav>
  );
}

function App() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Connect to WebSocket dynamically based on host
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
  }, []);

  return (
    <Router>
      <Navigation />
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-donor" element={<AddDonor />} />
          <Route path="/add-recipient" element={<AddRecipient />} />
        </Routes>
      </div>

      {notification && (
        <div className="notification-toast">
          <Bell color="#10b981" />
          <span>{notification}</span>
        </div>
      )}
    </Router>
  );
}

export default App;
