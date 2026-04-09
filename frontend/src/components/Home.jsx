import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Users, Activity, ExternalLink } from 'lucide-react';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <HeartPulse color="var(--accent-green)" size={64} style={{ margin: '0 auto 1.5rem auto' }} />
      <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--text-primary)' }}>
        Real-Time Organ Allocation
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        A deterministic, rule-based medical matching engine connecting incredible donors with patients in need, instantly and safely.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
        <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Get Started
        </button>
        <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Sign In
        </button>
      </div>

      <div className="grid grid-cols-2" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity color="var(--accent-blue)" /> Instant Matching
          </h3>
          <p className="page-description">
            The moment a donor registers, our transaction-locked engine allocates the organ to the most urgent waiting individual.
          </p>
        </div>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users color="var(--accent-green)" /> HIPAA Secure
          </h3>
          <p className="page-description">
            Your data is abstracted. Donors never see recipient details, keeping identity secure while tracking live statuses.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
