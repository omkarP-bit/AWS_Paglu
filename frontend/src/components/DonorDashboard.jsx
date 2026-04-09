import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HeartPulse, PlusCircle, CheckCircle, Activity } from 'lucide-react';

function DonorDashboard({ user }) {
  const [data, setData] = useState({ donors: [], hospitals: [] });
  const [loading, setLoading] = useState(true);
  const [showAddOrgan, setShowAddOrgan] = useState(false);
  const [newOrgan, setNewOrgan] = useState('kidney');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:8000/api/dashboard-data`);
      setData(response.data);
    } catch (error) {
      if (error.response?.status === 401) window.location.reload();
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws`);
    ws.onmessage = (event) => { if (JSON.parse(event.data).action) fetchData(); };
    return () => ws.close();
  }, []);

  const handleAddOrgan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await axios.post(`http://${window.location.hostname}:8000/api/donors/${user.reference_id}/organs`, { organ_type: newOrgan });
      setShowAddOrgan(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleOrganStatus = async (organId, currentStatus) => {
    if (currentStatus === 'allocated') return; // Cannot toggle if already given
    const newStatus = currentStatus === 'active' ? 'withdrawn' : 'active';
    try {
      await axios.put(`http://${window.location.hostname}:8000/api/organs/${organId}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loader" style={{margin: '4rem auto'}}></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={36} /> Donor Profile
          </h1>
          <p className="page-description">Manage your life-saving pledges.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddOrgan(true)}>
          <PlusCircle size={18} /> Pledge Another Organ
        </button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        {data.donors.length === 0 ? (
          <p className="page-description">No active donations found connected to your account.</p>
        ) : (
          data.donors.map(donor => (
            <div key={donor.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Your Gift Portfolio</h2>
                  <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Linked Hospital: {data.hospitals?.find(h => h.id === donor.hospital_id)?.name || 'Central Registry'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                {donor.organs.map(o => (
                  <div key={o.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '1.1rem', fontWeight: 'bold' }}>{o.organ_type}</span>
                      <span className={o.status === 'allocated' ? 'badge badge-green' : (o.status === 'active' ? 'badge badge-blue' : 'badge badge-red')}>
                        {o.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {o.status === 'allocated' ? (
                      <p style={{ fontSize: '0.875rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={16} /> Successfully matched and deployed.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Awaiting compatible match.</p>
                        <button 
                          onClick={() => toggleOrganStatus(o.id, o.status)}
                          className={`btn ${o.status === 'active' ? 'btn-outline' : 'btn-primary'}`} 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {o.status === 'active' ? 'Withdraw Pledge' : 'Re-Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddOrgan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Pledge an Additional Organ</h3>
            <p className="page-description" style={{ marginBottom: '1.5rem' }}>Select the organ you wish to volunteer.</p>
            <form onSubmit={handleAddOrgan}>
              <div className="form-group">
                <label className="form-label">Organ Type</label>
                <select className="form-select" value={newOrgan} onChange={(e) => setNewOrgan(e.target.value)}>
                  <option value="kidney">Kidney</option>
                  <option value="liver">Liver</option>
                  <option value="heart">Heart</option>
                  <option value="lungs">Lungs</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Pledging...' : 'Confirm Pledge'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddOrgan(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonorDashboard;
