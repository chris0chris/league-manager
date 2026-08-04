/**
 * Tests for components/UserJourneys.tsx
 *
 * Coverage targets:
 * - Summary stats render (sessions, users, events)
 * - User list and session timeline render from API data
 * - Category chips filter sessions
 * - Search box filters sessions by event name / metadata
 * - Session pill selection switches the active timeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { UserJourneys } from '../UserJourneys';
import { JourneySessionsResponse } from '../../types';

const mockResponse: JourneySessionsResponse = {
  sessions: [
    {
      id: 1,
      user: 'alice',
      started_at: '2026-08-03 10:00:00',
      ended_at: '2026-08-03 10:05:00',
      ongoing: false,
      duration_s: 300,
      event_count: 2,
      cat_counts: { discover: 1, publish: 1 },
      events: [
        { name: 'gameday_designer_opened', category: 'discover', meta: { gameday_id: '10' }, at: '2026-08-03 10:00:05' },
        { name: 'gameday_published', category: 'publish', meta: { gameday_id: '10' }, at: '2026-08-03 10:04:00' },
      ],
    },
    {
      id: 2,
      user: 'bob',
      started_at: '2026-08-02 09:00:00',
      ended_at: null,
      ongoing: true,
      duration_s: 90,
      event_count: 1,
      cat_counts: { live: 1 },
      events: [
        { name: 'game_started', category: 'live', meta: { game_id: '99' }, at: '2026-08-02 09:00:01' },
      ],
    },
  ],
  summary: {
    n_sessions: 2,
    n_users: 2,
    users: ['alice', 'bob'],
    n_events: 3,
    date_min: '2026-08-02 09:00:00',
    date_max: '2026-08-03 10:00:00',
    top_events: [['gameday_designer_opened', 1], ['gameday_published', 1], ['game_started', 1]],
  },
};

vi.mock('../../utils/api', () => ({
  fetchJourneySessions: vi.fn(() => Promise.resolve(mockResponse)),
}));

async function renderLoaded() {
  const result = render(React.createElement(UserJourneys));
  await waitFor(() => {
    expect(screen.getByText('alice — session #1')).toBeInTheDocument();
  });
  return result;
}

describe('UserJourneys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary stats', async () => {
    const { container } = render(React.createElement(UserJourneys));

    await waitFor(() => {
      expect(screen.getByText('alice — session #1')).toBeInTheDocument();
    });

    const statNumbers = Array.from(container.querySelectorAll('.uj-stat-n')).map((el) => el.textContent);
    expect(statNumbers).toEqual(['2', '2', '3', '1.5']);

    const text = screen.getByTestId('user-journeys').textContent || '';
    expect(text).toContain('Sessions');
    expect(text).toContain('Users');
    expect(text).toContain('Events / session');
  });

  it('renders user list sorted by most recent activity', async () => {
    const { container } = render(React.createElement(UserJourneys));

    await waitFor(() => {
      expect(screen.getByText('alice — session #1')).toBeInTheDocument();
    });

    const users = Array.from(container.querySelectorAll('.uj-card-user')).map((el) => el.textContent);
    expect(users).toEqual(['alice', 'bob']);
  });

  it('renders the timeline of the selected session with events in order', async () => {
    const { container } = render(React.createElement(UserJourneys));

    await waitFor(() => {
      expect(screen.getByText('alice — session #1')).toBeInTheDocument();
    });

    const detail = within(container.querySelector('.uj-detail') as HTMLElement);
    const timelineNames = Array.from(container.querySelectorAll('.uj-tl-name')).map((el) => el.textContent);
    expect(timelineNames).toEqual(['gameday_designer_opened', 'gameday_published']);
    expect(detail.getAllByText('Discover').length).toBeGreaterThan(0);
    expect(detail.getAllByText('Publish').length).toBeGreaterThan(0);
  });

  it('switches session timeline when a session pill is clicked', async () => {
    const { container } = await renderLoaded();

    const detail = within(container.querySelector('.uj-detail') as HTMLElement);
    const bobCard = screen.getAllByRole('button').find(
      (el) => el.classList.contains('uj-session-card') && el.textContent?.includes('bob')
    );
    fireEvent.click(bobCard as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText('bob — session #2')).toBeInTheDocument();
    });
    expect(detail.getByText('game_started')).toBeInTheDocument();
    expect(detail.getByText('game_id=99')).toBeInTheDocument();
  });

  it('filters sessions by category chip', async () => {
    render(React.createElement(UserJourneys));

    await waitFor(() => {
      expect(screen.getByText('alice — session #1')).toBeInTheDocument();
    });

    const chips = screen.getAllByRole('button').filter((el) => el.classList.contains('uj-chip'));
    const liveChip = chips.find((c) => c.textContent?.includes('Live/Match'));
    fireEvent.click(liveChip as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText('bob — session #2')).toBeInTheDocument();
    });
    expect(screen.queryByText('alice — session #1')).not.toBeInTheDocument();
  });

  it('filters sessions by search query', async () => {
    render(React.createElement(UserJourneys));

    await waitFor(() => {
      expect(screen.getByText('alice — session #1')).toBeInTheDocument();
    });

    const search = screen.getByLabelText('Search events') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'game_started' } });

    await waitFor(() => {
      expect(screen.getByText('bob — session #2')).toBeInTheDocument();
    });
    expect(screen.queryByText('alice — session #1')).not.toBeInTheDocument();
  });
});
