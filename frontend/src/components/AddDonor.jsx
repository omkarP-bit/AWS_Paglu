import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

function AddDonor() {
  const [formData, setFormData] = useState({
    name: '',
    blood_group: 'A+',
    hospital_id: 'HOSP-001',
    organ_type: 'kidney'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`http://${window.location.hostname}:8000/api/donors`, formData);
      navigate('/');
    } catch (error) {
      console.error(error);
      alert("Failed to register donor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Heart size={24} color="var(--accent-red)" />
        Register Organ Donor
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
            <label className="form-label">Organ Donating</label>
            <select 
              className="form-select"
              value={formData.organ_type}
              onChange={(e) => setFormData({...formData, organ_type: e.target.value})}
            >
              <option value="kidney">Kidney</option>
              <option value="liver">Liver</option>
              <option value="heart">Heart</option>
              <option value="lungs">Lungs</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Hospital ID</label>
          <input 
            type="text" 
            className="form-input" 
            required 
            value={formData.hospital_id}
            onChange={(e) => setFormData({...formData, hospital_id: e.target.value})}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Processing...' : 'Register Donor & Run Match'}
        </button>
      </form>
    </div>
  );
}

export default AddDonor;
