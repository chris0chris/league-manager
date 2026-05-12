import React from 'react';
import { StatsResponse } from '../types';

interface SummaryCardsProps {
  stats: StatsResponse | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, loading }) => {
  if (loading) return <div>Loading...</div>;
  if (!stats) return null;

  return (
    <div className="summary-cards" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
      <div className="card" style={cardStyle}>
        <div className="card-value" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0d6efd' }}>
          {stats.total_events}
        </div>
        <div className="card-label">Events Today</div>
      </div>
      <div className="card" style={cardStyle}>
        <div className="card-value" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0d6efd' }}>
          {stats.unique_event_types}
        </div>
        <div className="card-label">Event Types</div>
      </div>
    </div>
  );
};

const cardStyle = {
  padding: '1rem',
  border: '1px solid #dee2e6',
  borderRadius: '0.5rem',
  flex: 1,
  backgroundColor: '#fff',
};
