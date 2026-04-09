import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/login`, { email, password });
      const data = res.data;
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({ role: data.role, email: data.email, reference_id: data.reference_id }));
      setToken(data.access_token);
      setUser({ role: data.role, email: data.email, reference_id: data.reference_id });
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Welcome Back</h2>
      {error && <p style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" required className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" required className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>Login</button>
        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          Don't have an account? <span onClick={() => navigate('/signup')} style={{ color: 'var(--accent-green)', cursor: 'pointer' }}>Sign up</span>
        </div>
      </form>
    </div>
  );
}

export default Login;
