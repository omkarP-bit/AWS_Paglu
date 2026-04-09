import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Signup({ setToken, setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin',
    name: '',
    age: '',
    contact_number: '',
    consent_given: false,
    blood_group: 'O+',
    organ: 'kidney',
    hospital_id: '',
    doctor_notes: '',
    urgency_score: 5
  });
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrReasons, setOcrReasons] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://${window.location.hostname}:8000/api/hospitals`)
      .then(res => {
        setHospitals(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, hospital_id: res.data[0].id }));
        }
      })
      .catch(err => console.error("Could not fetch hospitals", err));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setOcrLoading(true);
    const formDataFile = new FormData();
    formDataFile.append("file", file);

    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/analyze-report`, formDataFile, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setFormData(prev => ({ 
          ...prev, 
          urgency_score: Math.min(10, prev.urgency_score + res.data.score_boost)
        }));
        setOcrReasons(res.data.extracted_reasons);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/signup`, {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null
      });
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
    <div className="card" style={{ maxWidth: '600px', margin: '4rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Create Account</h2>
      {error && <p style={{ color: 'var(--accent-red)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleSignup}>
        <div className="form-group">
          <label className="form-label">I am registering as a...</label>
          <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <option value="admin">Hospital Admin</option>
            <option value="donor">Organ Donor</option>
            <option value="recipient">Patient (Recipient)</option>
          </select>
        </div>

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

        {formData.role !== 'admin' && (
          <>
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" required className="form-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Linked Hospital</label>
                <select className="form-select" value={formData.hospital_id} onChange={(e) => setFormData({...formData, hospital_id: e.target.value})}>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name} - {h.location}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input type="number" required className="form-input" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input type="text" required className="form-input" value={formData.contact_number} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} />
              </div>
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
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                <input type="checkbox" required id="consent" checked={formData.consent_given} onChange={(e) => setFormData({...formData, consent_given: e.target.checked})} />
                <label htmlFor="consent" style={{ fontSize: '0.875rem' }}>I freely consent to donate my organ under the National Transplant Guidelines.</label>
              </div>
            )}

            {formData.role === 'recipient' && (
              <>
                <div className="form-group">
                  <label className="form-label">Upload Medical Report (Automatic OCR Scoring)</label>
                  <input type="file" onChange={handleFileUpload} className="form-input" accept="image/*,.pdf" />
                  {ocrLoading && <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '0.5rem' }}>Scanning document...</p>}
                  {ocrReasons.length > 0 && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>Auto-Adjustments applied:</p>
                      <ul style={{ fontSize: '0.75rem', paddingLeft: '1.5rem', color: 'var(--accent-green)' }}>
                        {ocrReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Base Medical Urgency (1-10)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type="range" min="1" max="10" className="form-input" style={{ padding: '0' }} value={formData.urgency_score} onChange={(e) => setFormData({...formData, urgency_score: parseInt(e.target.value)})} />
                    <span style={{ fontWeight: 'bold', width: '2rem' }}>{formData.urgency_score}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Doctor's Notes (Optional)</label>
                  <textarea className="form-input" rows="3" value={formData.doctor_notes} onChange={(e) => setFormData({...formData, doctor_notes: e.target.value})}></textarea>
                </div>
              </>
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
