import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

function AddRecipient() {
  const [formData, setFormData] = useState({
    name: '',
    blood_group: 'O+',
    organ_needed: 'kidney',
    urgency_score: 5
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`http://${window.location.hostname}:8000/api/recipients`, formData);
      navigate('/');
    } catch (error) {
      console.error(error);
      alert("Failed to waitlist recipient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={24} color="var(--accent-blue)" />
        Waitlist Patient
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input 
            type="text" 
            className="form-input" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2">
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select 
              className="form-select"
              value={formData.blood_group}
              onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Organ Needed</label>
            <select 
              className="form-select"
              value={formData.organ_needed}
              onChange={(e) => setFormData({...formData, organ_needed: e.target.value})}
            >
              <option value="kidney">Kidney</option>
              <option value="liver">Liver</option>
              <option value="heart">Heart</option>
              <option value="lungs">Lungs</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Medical Urgency Score (1-10)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input 
              type="range" 
              min="1" 
              max="10" 
              className="form-input" 
              style={{ padding: '0' }}
              value={formData.urgency_score}
              onChange={(e) => setFormData({...formData, urgency_score: parseInt(e.target.value)})}
            />
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', width: '2rem', textAlign: 'center' }}>
              {formData.urgency_score}
            </span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Processing...' : 'Add to Waitlist'}
        </button>
      </form>
    </div>
  );
}

export default AddRecipient;
