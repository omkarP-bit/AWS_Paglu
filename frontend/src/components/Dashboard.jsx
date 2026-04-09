import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Users, FileHeart } from 'lucide-react';

function Dashboard({ user }) {
  const [data, setData] = useState({ donors: [], recipients: [], allocations: [] });
  const [loading, setLoading] = useState(true);

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
        fetchData();
      }
    };

    return () => ws.close();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  // Admin / Hospital Role view
  if (user.role === 'admin') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Hospital Administration</h1>
          <p className="page-description">HIPAA-compliant abstracted view of all system activities.</p>
        </div>

        <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
              <Users color="var(--accent-blue)" size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.recipients.length}</h2>
              <p className="page-description">Total Waitlist Entries</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
              <FileHeart color="var(--accent-green)" size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.allocations.length}</h2>
              <p className="page-description">Successful Allocations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--accent-blue)" />
              Recent Allocations
            </h2>
            {data.allocations.length === 0 ? (
              <p className="page-description">No allocations found.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allocations.slice(0, 5).map(alloc => (
                      <tr key={alloc.id}>
                        <td>{new Date(alloc.allocation_time).toLocaleString()}</td>
                        <td><span className="badge badge-green">{alloc.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--accent-red)" />
              Waitlist Priority
            </h2>
            {data.recipients.filter(r => r.status === 'waiting').length === 0 ? (
              <p className="page-description">No waiting patients.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Organ</th>
                      <th>Blood</th>
                      <th>Urgency</th>
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
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Personal Donor view
  if (user.role === 'donor') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Donor Status</h1>
          <p className="page-description">Thank you for your generous gift of life.</p>
        </div>
        
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Your Donations</h2>
          {data.donors.length === 0 ? (
            <p>No active donations found.</p>
          ) : (
             data.donors.map(donor => (
               <div key={donor.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                 <p><strong>Name:</strong> {donor.name}</p>
                 <p><strong>Status:</strong> <span className={donor.status === 'active' ? 'badge badge-green' : 'badge badge-blue'}>{donor.status}</span></p>
                 <p><strong>Organs Volunteered:</strong></p>
                 <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                   {donor.organs.map(o => (
                     <li key={o.id}>{o.organ_type} - <span className={o.status === 'allocated' ? 'badge badge-green' : 'badge badge-blue'}>{o.status}</span></li>
                   ))}
                 </ul>
               </div>
             ))
          )}
        </div>
      </div>
    );
  }

  // Personal Recipient View
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Journey</h1>
        <p className="page-description">Your live waitlist and allocation status.</p>
      </div>
      
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>My Applications</h2>
        {data.recipients.length === 0 ? (
          <p>No applications found.</p>
        ) : (
          data.recipients.map(r => (
            <div key={r.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <p><strong>Status:</strong> <span className={r.status === 'allocated' ? 'badge badge-green' : (r.status === 'waiting' ? 'badge badge-blue' : 'badge badge-red')}>{r.status}</span></p>
              <p><strong>Organ Needed:</strong> {r.organ_needed}</p>
              <p><strong>Urgency Level:</strong> Level {r.urgency_score}</p>
              <p><strong>Registered:</strong> {new Date(r.waiting_since).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;
