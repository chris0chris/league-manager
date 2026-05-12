import React, { useState, useEffect } from 'react';
import JourneyLayout from './components/JourneyLayout';
import { SummaryCards } from './components/SummaryCards';
import { TopActionsTable } from './components/TopActionsTable';
import { UserTimeline } from './components/UserTimeline';
import { fetchStats } from './utils/api';
import { StatsResponse } from './types';
import './index.css';

function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth is handled by Django's LoginRequiredMixin on the server side.
  // The API calls will use either the Knox token (if available) or the session cookie.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found in localStorage, falling back to session authentication');
    }
  }, []);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await fetchStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <JourneyLayout>
      <div className="app" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1>User Journey Dashboard</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Track admin user actions and engagement patterns.
        </p>

        <SummaryCards stats={stats} loading={loading} />
        <TopActionsTable stats={stats} loading={loading} />
        <UserTimeline />
      </div>
    </JourneyLayout>
  );
}

export default App;
