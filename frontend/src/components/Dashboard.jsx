import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Users, FileHeart, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

function Dashboard({ user }) {
  const [data, setData] = useState({ donors: [], recipients: [], allocations: [], hospitals: [] });
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideScore, setOverrideScore] = useState(1);

  const fetchData = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:8000/api/dashboard-data`);
      setData(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const wsUrl = `ws://${window.location.hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.action) {
        fetchData(); // Trigger reload
      }
    };

    return () => ws.close();
  }, []);

  const handlePriorityOverride = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;
    try {
      await axios.put(`http://${window.location.hostname}:8000/api/recipients/${overrideTarget.id}/urgency`, {
        urgency_score: overrideScore
      });
      setOverrideTarget(null);
      fetchData(); // Sync up manually though WS will trigger too
    } catch (err) {
      console.error("Failed to override", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (user.role === 'admin') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Master Control Center</h1>
            <p className="page-description">HIPAA-compliant Live System Administration.</p>
          </div>
          <div className="badge badge-green" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            <Activity size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> System Active
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--accent-green)" /> Allocation Matching Engine
            </h2>
            <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {data.allocations.length === 0 ? <p className="page-description">No allocations logged yet.</p> : (
                data.allocations.slice(0, 5).map(alloc => {
                  const matchDetails = alloc.match_score || {};
                  return (
                    <div key={alloc.id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid var(--accent-green)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>Match Completed</strong>
                        <span className="text-secondary">{new Date(alloc.allocation_time).toLocaleTimeString()}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Allocated <strong style={{ textTransform: 'uppercase' }}>{matchDetails.organ_type}</strong> based on compatibility: 
                        <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{matchDetails.blood_compatibility}</span>
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--accent-green)' }}>
                        <strong>Explainability:</strong> Selected automatically due to exact blood match and highest queue urgency profile (Score: {matchDetails.urgency_score_matched}).
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

        {/* Override Modal */}
        {overrideTarget && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '400px' }}>
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

  // --- DONOR VIEW ---
  if (user.role === 'donor') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Donor Status</h1>
          <p className="page-description">Thank you for your generous gift of life.</p>
        </div>
        
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Active Donations</h2>
          {data.donors.length === 0 ? (
            <p>No active donations found connected to your account.</p>
          ) : (
             data.donors.map(donor => (
               <div key={donor.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                   <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Gift Profile</span>
                   <span className={donor.status === 'active' ? 'badge badge-green' : 'badge badge-blue'}>{donor.status}</span>
                 </div>
                 
                 <div className="grid grid-cols-2">
                   <div>
                     <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Linked Hospital</p>
                     <p>{data.hospitals?.find(h => h.id === donor.hospital_id)?.name || 'Central Registry'}</p>
                   </div>
                   <div>
                     <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Organs Pledged</p>
                     {donor.organs.map(o => (
                       <div key={o.id} style={{ marginTop: '0.25rem' }}>
                         <span style={{ textTransform: 'capitalize', marginRight: '0.5rem' }}>{o.organ_type}</span>
                         <span className={o.status === 'allocated' ? 'badge badge-green' : 'badge badge-blue'} style={{ fontSize: '0.65rem' }}>
                           {o.status === 'allocated' ? 'MATCH FOUND & DEPLOYED' : 'AWAITING MATCH'}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             ))
          )}
        </div>
      </div>
    );
  }

  // --- RECIPIENT VIEW ---
  // Calculate queue position if waitlisted
  const calculateQueue = (recip) => {
    if (recip.status !== 'waiting') return null;
    const allWaitingForSame = data.recipients.filter(r => r.status === 'waiting' && r.organ_needed === recip.organ_needed && r.id !== recip.id);
    const higherPriority = allWaitingForSame.filter(r => r.urgency_score > recip.urgency_score).length;
    return higherPriority + 1;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Journey</h1>
        <p className="page-description">Your live waitlist and allocation tracking.</p>
      </div>
      
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Application Status</h2>
        {data.recipients.length === 0 ? (
          <p>No applications found.</p>
        ) : (
          data.recipients.map(r => {
            const queuePos = calculateQueue(r);
            return (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{r.organ_needed} Transplant Program</span>
                  <span className={r.status === 'allocated' ? 'badge badge-green' : (r.status === 'waiting' ? 'badge badge-blue' : 'badge badge-red')} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
                    {r.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                  <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Current Urgency Level</p>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: r.urgency_score > 7 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                      Level {r.urgency_score} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 10</span>
                    </p>
                  </div>
                  
                  {r.status === 'waiting' && (
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <p style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Estimated Queue Position</p>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                        #{queuePos}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Based on regional urgency algorithms.</p>
                    </div>
                  )}

                  {r.status === 'allocated' && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <p style={{ color: 'var(--accent-green)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>Allocation Confirmed</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                        Match Found. Prepare Immediately.
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Hospital coordination will contact you.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Dashboard;
