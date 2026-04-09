import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Signup({ setToken, setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin',
    name: '',
    blood_group: 'O+',
    organ: 'kidney',
    hospital_id: '',
    urgency_score: 5
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/signup`, formData);
      const data = res.data;
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({ role: data.role, email: data.email, reference_id: data.reference_id }));
      setToken(data.access_token);
      setUser({ role: data.role, email: data.email, reference_id: data.reference_id });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '4rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Create Account</h2>
      {error && <p style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleSignup}>
        <div className="grid grid-cols-2">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" required className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" required className="form-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">I am a...</label>
          <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <option value="admin">Hospital Admin</option>
            <option value="donor">Organ Donor</option>
            <option value="recipient">Patient (Recipient)</option>
          </select>
        </div>

        {formData.role !== 'admin' && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" required className="form-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={formData.blood_group} onChange={(e) => setFormData({...formData, blood_group: e.target.value})}>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">{formData.role === 'donor' ? 'Organ to Donate' : 'Organ Needed'}</label>
                <select className="form-select" value={formData.organ} onChange={(e) => setFormData({...formData, organ: e.target.value})}>
                  <option value="kidney">Kidney</option>
                  <option value="liver">Liver</option>
                  <option value="heart">Heart</option>
                  <option value="lungs">Lungs</option>
                </select>
              </div>
            </div>

            {formData.role === 'donor' && (
              <div className="form-group">
                <label className="form-label">Hospital ID</label>
                <input type="text" required className="form-input" value={formData.hospital_id} onChange={(e) => setFormData({...formData, hospital_id: e.target.value})} />
              </div>
            )}

            {formData.role === 'recipient' && (
              <div className="form-group">
                <label className="form-label">Medical Urgency (1-10)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="range" min="1" max="10" className="form-input" style={{ padding: '0' }} value={formData.urgency_score} onChange={(e) => setFormData({...formData, urgency_score: parseInt(e.target.value)})} />
                  <span style={{ fontWeight: 'bold', width: '2rem' }}>{formData.urgency_score}</span>
                </div>
              </div>
            )}
          </>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Creating...' : 'Sign Up'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1rem' }}>
          Already have an account? <span onClick={() => navigate('/login')} style={{ color: 'var(--accent-green)', cursor: 'pointer' }}>Login</span>
        </div>
      </form>
    </div>
  );
}

export default Signup;
