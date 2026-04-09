import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

function AdminDashboard({ user }) {
  const [data, setData] = useState({ donors: [], recipients: [], allocations: [], hospitals: [] });
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState(1);

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

  const handlePriorityOverride = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;
    try {
      await axios.put(`http://${window.location.hostname}:8000/api/recipients/${overrideTarget.id}/urgency`, { urgency_score: overrideScore });
      setOverrideTarget(null);
      fetchData();
    } catch (err) {
      console.error("Failed to override", err);
    }
  };

  if (loading) return <div className="loader" style={{margin: '4rem auto'}}></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--accent-green)' }}>Master Control Center</h1>
          <p className="page-description">HIPAA-compliant Live System Administration.</p>
        </div>
        <div className="badge badge-green" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
          <Activity size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> System Active
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Clock size={20} color="var(--accent-blue)" /> Live Donor Feed
          </h2>
          <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>Donor ID</th><th>Organ</th><th>Status</th></tr></thead>
              <tbody>
                {data.donors.slice(0, 10).map(d => 
                  d.organs.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace' }}>{d.id.split('-')[0]}***</td>
                      <td><span className="badge badge-blue">{o.organ_type}</span></td>
                      <td><span className={o.status === 'allocated' ? 'badge badge-green' : 'badge badge-blue'}>{o.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <ShieldCheck size={20} color="var(--accent-green)" /> Allocation Matching Engine
          </h2>
          <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {data.allocations.length === 0 ? <p className="page-description">No allocations logged yet.</p> : (
              data.allocations.slice(0, 5).map(alloc => {
                const matchDetails = alloc.match_score || {};
                return (
                  <div key={alloc.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid var(--accent-green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>Match Completed</strong>
                      <span className="text-secondary" style={{fontSize: '0.8rem'}}>{new Date(alloc.allocation_time).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Allocated <strong style={{ textTransform: 'uppercase' }}>{matchDetails.organ_type}</strong> based on compatibility: 
                      <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{matchDetails.blood_compatibility}</span>
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--accent-green)' }}>
                      <strong>Explainability:</strong> Highest queue urgency profile (Score: {matchDetails.urgency_score_matched}).
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <AlertTriangle size={20} color="var(--accent-red)" /> Priority Waiting List
        </h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Patient (HIPAA Masked)</th>
                <th>Organ Needed</th>
                <th>Blood</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients
                .filter(r => r.status === 'waiting')
                .sort((a,b) => b.urgency_score - a.urgency_score)
                .map(recip => (
                  <tr key={recip.id}>
                    <td>{recip.name}</td>
                    <td><span className="badge badge-blue">{recip.organ_needed}</span></td>
                    <td>{recip.blood_group}</td>
                    <td><span className={recip.urgency_score > 7 ? "badge badge-red" : "badge badge-blue"}>Level {recip.urgency_score}</span></td>
                    <td>{recip.status}</td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setOverrideTarget(recip); setOverrideScore(recip.urgency_score); }}>
                        Override
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {overrideTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', backgroundColor: 'var(--panel-bg)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-red)' }}>Emergency Priority Override</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>Adjust urgency score for Patient {overrideTarget.name}</p>
            <form onSubmit={handlePriorityOverride}>
              <div className="form-group">
                <label className="form-label">New Urgency Score (1-10)</label>
                <input type="number" min="1" max="10" required className="form-input" value={overrideScore} onChange={(e) => setOverrideScore(parseInt(e.target.value))} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-red)' }}>Confirm Override</button>
                <button type="button" className="btn btn-outline" onClick={() => setOverrideTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
