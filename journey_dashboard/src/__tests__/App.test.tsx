/**
 * Tests for App with JourneyLayout integration
 *
 * Coverage targets:
 * - JourneyLayout component renders correctly
 * - Dashboard content renders properly
 * - Component hierarchy: App → JourneyLayout → content
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock the API calls to prevent actual HTTP requests
vi.mock('../utils/api', () => ({
  fetchStats: vi.fn(() => Promise.resolve(null)),
}));

// Mock the child components to simplify testing
vi.mock('../components/SummaryCards', () => ({
  SummaryCards: () => <div data-testid="summary-cards">Summary Cards</div>,
}));

vi.mock('../components/TopActionsTable', () => ({
  TopActionsTable: () => <div data-testid="top-actions-table">Top Actions Table</div>,
}));

vi.mock('../components/UserTimeline', () => ({
  UserTimeline: () => <div data-testid="user-timeline">User Timeline</div>,
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
      const title = screen.getByText('User Journey Dashboard');
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
      expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
      expect(screen.getByTestId('top-actions-table')).toBeInTheDocument();
      expect(screen.getByTestId('user-timeline')).toBeInTheDocument();
    });
  });
});
