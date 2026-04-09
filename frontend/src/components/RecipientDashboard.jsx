import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, UploadCloud, Target } from 'lucide-react';

function RecipientDashboard({ user }) {
  const [data, setData] = useState({ recipients: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://${window.location.hostname}:8000/api/dashboard-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleUpdateReport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadResult(null);
    const formDataFile = new FormData();
    formDataFile.append("file", file);

    try {
      const res = await axios.post(`http://${window.location.hostname}:8000/api/recipients/${user.reference_id}/reports`, formDataFile, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setUploadResult({ success: true, reasons: res.data.reasons, newScore: res.data.new_score });
        fetchData();
      } else {
        setUploadResult({ success: false, message: res.data.message });
      }
    } catch (err) {
      setUploadResult({ success: false, message: "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const calculateQueue = (recip) => {
    if (recip.status !== 'waiting') return null;
    const allWaitingForSame = data.recipients.filter(r => r.status === 'waiting' && r.organ_needed === recip.organ_needed && r.id !== recip.id);
    const higherPriority = allWaitingForSame.filter(r => r.urgency_score > recip.urgency_score).length;
    return higherPriority + 1;
  };

  if (loading) return <div className="loader" style={{margin: '4rem auto'}}></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={36} /> My Treatment Journey
        </h1>
        <p className="page-description">Your live medical waitlist tracking.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Current Application</span>
          {data.recipients[0] && (
            <span className={data.recipients[0].status === 'allocated' ? 'badge badge-green' : 'badge badge-blue'}>
              {data.recipients[0].status.toUpperCase()}
            </span>
          )}
        </h2>

        {data.recipients.length === 0 ? (
          <p className="page-description">No applications found.</p>
        ) : (
          data.recipients.map(r => {
            const queuePos = calculateQueue(r);
            return (
              <div key={r.id}>
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Algorithm Urgency Level</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: r.urgency_score > 7 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                          {r.urgency_score} <span style={{ fontSize: '1.25rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 10</span>
                        </p>
                      </div>
                      <Activity size={32} color={r.urgency_score > 7 ? "var(--accent-red)" : "var(--accent-blue)"} />
                    </div>

                    {r.status === 'waiting' && (
                      <div style={{ marginTop: '2rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Has your condition changed?</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Upload a new doctor's report to update your algorithmic priority instantly.</p>
                        <label className={`btn ${uploading ? 'btn-outline' : 'btn-primary'}`} style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                          <UploadCloud size={18} /> {uploading ? 'Scanning...' : 'Upload Updated Report'}
                          <input type="file" style={{ display: 'none' }} accept="image/*,.pdf" onChange={handleUpdateReport} disabled={uploading} />
                        </label>
                        
                        {uploadResult && uploadResult.success && (
                          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>Update Processed!</p>
                            <ul style={{ fontSize: '0.75rem', paddingLeft: '1.5rem', marginTop: '0.25rem', color: 'var(--accent-green)' }}>
                              {uploadResult.reasons.map((res, i) => <li key={i}>{res}</li>)}
                            </ul>
                          </div>
                        )}
                        {uploadResult && !uploadResult.success && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '0.5rem' }}>{uploadResult.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {r.status === 'waiting' && (
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <p style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>Estimated Queue Position</p>
                      <p style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--accent-blue)', lineHeight: '1' }}>
                        #{queuePos}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        Waiting for a compatible <strong style={{ textTransform: 'uppercase' }}>{r.organ_needed}</strong> match.
                      </p>
                    </div>
                  )}

                  {r.status === 'allocated' && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <p style={{ color: 'var(--accent-green)', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'bold' }}>Allocation Confirmed</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                        Match Found.
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Hospital coordination staff have been alerted to begin transfer preparations.</p>
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

export default RecipientDashboard;
