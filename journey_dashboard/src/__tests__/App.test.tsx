/**
 * Tests for App with JourneyLayout integration
 *
 * Coverage targets:
 * - JourneyLayout component renders correctly
 * - Dashboard content renders properly
 * - Component hierarchy: App → JourneyLayout → content
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock the API calls to prevent actual HTTP requests
vi.mock('../utils/api', () => ({
  fetchJourneySessions: vi.fn(() => Promise.resolve({ sessions: [], summary: { n_sessions: 0, n_users: 0, users: [], n_events: 0, date_min: null, date_max: null, top_events: [] } })),
  fetchGlobalAdoption: vi.fn(() => Promise.resolve({
    gameday: { opens: 0 },
    passcheck: { opens: 0 },
    scorecard: { opens: 0 }
  })),
}));

// Mock the child components to simplify testing
vi.mock('../components/AdoptionMetrics', () => ({
  AdoptionMetrics: () => <div data-testid="adoption-metrics">Adoption Metrics</div>,
}));

vi.mock('../components/UserJourneys', () => ({
  UserJourneys: () => <div data-testid="user-journeys">User Journeys</div>,
}));

describe('App with JourneyLayout', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should render page title in content area', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      const title = screen.getByText('Global Journey Dashboard');
      expect(title).toBeInTheDocument();
    });
  });

  it('should render main content components', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('adoption-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('user-journeys')).toBeInTheDocument();
    });
  });
});
