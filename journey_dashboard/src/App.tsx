import { useState, useEffect } from 'react';
import JourneyLayout from './components/JourneyLayout';
import GameProgressPage from './components/game-progress/GameProgressPage';
import { AdoptionMetrics } from './components/AdoptionMetrics';
import { UserJourneys } from './components/UserJourneys';
import { fetchGlobalAdoption } from './utils/api';
import { GlobalAdoptionResponse } from './types';
import './index.css';

function getCurrentPage(): 'journey' | 'progress' {
  const pathname = window.location.pathname;
  if (pathname.includes('/gamedays/progress/')) {
    return 'progress';
  }
  return 'journey';
}

function App() {
  const [adoptionData, setAdoptionData] = useState<GlobalAdoptionResponse | null>(null);
  const [currentPage] = useState<'journey' | 'progress'>(getCurrentPage());

  // Auth is handled by Django's LoginRequiredMixin on the server side.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found in localStorage, falling back to session authentication');
    }
  }, []);

  // Load data for journey dashboard
  useEffect(() => {
    // Only load journey data when on the journey page
    if (currentPage !== 'journey') return;

    const loadData = async () => {
      try {
        const adoption = await fetchGlobalAdoption();
        setAdoptionData(adoption);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadData();
  }, [currentPage]);

  // Render game progress page
  if (currentPage === 'progress') {
    return <GameProgressPage />;
  }

  // Render journey dashboard
  return (
    <JourneyLayout>
      <div className="app" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Global Journey Dashboard</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          System-wide feature adoption and engagement patterns.
        </p>

        <AdoptionMetrics adoptionData={adoptionData} />
        <UserJourneys />
      </div>
    </JourneyLayout>
  );
}

export default App;
