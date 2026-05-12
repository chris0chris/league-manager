import React, { useState, useEffect } from 'react';
import { Journey, JourneyEvent } from '../types';
import { fetchJourneys, fetchEvents } from '../utils/api';
import { GamedayFunnel } from './GamedayFunnel';
import { AdoptionMetrics } from './AdoptionMetrics';
import './UserTimeline.css';

type FeatureFilter = 'all' | 'gameday_designer' | 'passcheck' | 'scorecard';

export const UserTimeline: React.FC = () => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureFilter, setFeatureFilter] = useState<FeatureFilter>('all');

  useEffect(() => {
    const loadJourneys = async () => {
      try {
        setLoading(true);
        const data = await fetchJourneys();
        setJourneys(data);
        if (data.length > 0) {
          setSelectedJourneyId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load journeys:', err);
      } finally {
        setLoading(false);
      }
    };
    loadJourneys();
  }, []);

  useEffect(() => {
    if (selectedJourneyId) {
      const loadEvents = async () => {
        try {
          const data = await fetchEvents(selectedJourneyId);
          setEvents(data);
        } catch (err) {
          console.error('Failed to load events:', err);
        }
      };
      loadEvents();
    }
  }, [selectedJourneyId]);

  const filterEvents = (events: JourneyEvent[], filter: FeatureFilter): JourneyEvent[] => {
    switch (filter) {
      case 'gameday_designer':
        return events.filter(
          (e) => e.event_name.startsWith('gameday_') || e.event_name.startsWith('template_')
        );
      case 'passcheck':
        return events.filter((e) => e.event_name.startsWith('passcheck_'));
      case 'scorecard':
        return events.filter((e) => e.event_name.startsWith('scorecard_'));
      case 'all':
      default:
        return events;
    }
  };

  const filteredEvents = filterEvents(events, featureFilter);
  const gamedayEvents = filterEvents(events, 'gameday_designer');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'active';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="user-timeline">
      <h3>Journey Timeline</h3>
      <select
        value={selectedJourneyId || ''}
        onChange={(e) => setSelectedJourneyId(Number(e.target.value))}
        className="form-select mb-3"
      >
        {journeys.map((j) => (
          <option key={j.id} value={j.id}>
            {formatDate(j.started_at)} to {formatDate(j.ended_at)}
          </option>
        ))}
      </select>

      <div className="filter-controls">
        <label htmlFor="feature-filter">Filter by Feature:</label>
        <select
          id="feature-filter"
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value as FeatureFilter)}
          className="feature-filter-select"
        >
          <option value="all">All Features</option>
          <option value="gameday_designer">Gameday Designer</option>
          <option value="passcheck">Passcheck</option>
          <option value="scorecard">Scorecard</option>
        </select>
      </div>

      {featureFilter === 'gameday_designer' && gamedayEvents.length > 0 && (
        <div className="adoption-section">
          <AdoptionMetrics events={gamedayEvents} />
          <GamedayFunnel events={gamedayEvents} />
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        {filteredEvents.length === 0 ? (
          <p>No events in this journey</p>
        ) : (
          <div style={{ borderLeft: '3px solid #0d6efd', paddingLeft: '1rem' }}>
            {filteredEvents.map((event) => (
              <div key={event.id} style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f8f9fa' }}>
                <div style={{ fontWeight: 'bold', color: '#0d6efd' }}>
                  {event.event_name}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {new Date(event.created_at).toLocaleString()}
                </div>
                {Object.keys(event.metadata).length > 0 && (
                  <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {JSON.stringify(event.metadata)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
