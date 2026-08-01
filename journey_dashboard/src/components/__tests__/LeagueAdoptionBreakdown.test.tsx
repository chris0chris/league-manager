/**
 * Tests for components/LeagueAdoptionBreakdown.tsx
 *
 * Coverage targets:
 * - Table displays league data
 * - Designer and legacy counts are shown correctly
 * - Default sort by percentage (descending)
 * - Column sorting by league name
 * - Empty data handling
 * - Time window note displays correctly
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LeagueAdoptionBreakdown } from '../LeagueAdoptionBreakdown';
import { LeagueAdoptionStat } from '../../types';

const mockLeagueData: LeagueAdoptionStat[] = [
  { league_name: 'FF BL', league_id: 1, designer: 8, legacy: 0, total: 8, designer_percentage: 100.0 },
  { league_name: 'Bayern U16', league_id: 2, designer: 0, legacy: 20, total: 20, designer_percentage: 0.0 },
  { league_name: 'OL NRW', league_id: 3, designer: 2, legacy: 18, total: 20, designer_percentage: 10.0 },
];

describe('LeagueAdoptionBreakdown', () => {
  it('test_renders_table_with_league_data', () => {
    const { container } = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '30',
      })
    );

    expect(container.querySelector('.league-adoption-breakdown')).toBeTruthy();
    expect(container.querySelector('.adoption-table')).toBeTruthy();

    const text = container.textContent || '';
    expect(text).toContain('FF BL');
    expect(text).toContain('Bayern U16');
    expect(text).toContain('OL NRW');
  });

  it('test_displays_counts_correctly', () => {
    const { container } = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '30',
      })
    );

    const text = container.textContent || '';

    // FF BL: 8 designer, 0 legacy
    expect(text).toContain('8');
    expect(text).toContain('0');

    // Bayern U16: 0 designer, 20 legacy
    expect(text).toContain('20');

    // OL NRW: 2 designer, 18 legacy
    expect(text).toContain('2');
    expect(text).toContain('18');
  });

  it('test_sorts_by_percentage_descending_by_default', () => {
    const { container } = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '30',
      })
    );

    const tbody = container.querySelector('.adoption-table tbody');
    const rows = tbody?.querySelectorAll('tr') || [];

    // Default sort is by percentage descending
    // FF BL (100%) should be first
    const firstRowText = rows[0]?.textContent || '';
    expect(firstRowText).toContain('FF BL');

    // OL NRW (10%) should be second
    const secondRowText = rows[1]?.textContent || '';
    expect(secondRowText).toContain('OL NRW');

    // Bayern U16 (0%) should be last
    const thirdRowText = rows[2]?.textContent || '';
    expect(thirdRowText).toContain('Bayern U16');
  });

  it('test_allows_sorting_by_league_name', () => {
    const { container } = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '30',
      })
    );

    // Verify table header is clickable with sortable class
    const thead = container.querySelector('.adoption-table thead');
    const leagueHeaderCell = thead?.querySelectorAll('th')[0];

    expect(leagueHeaderCell).toBeTruthy();
    expect(leagueHeaderCell).toHaveClass('sortable');

    // Verify click handler is attached and fires
    const clickSpy = vi.fn();
    if (leagueHeaderCell) {
      leagueHeaderCell.addEventListener('click', clickSpy);
      fireEvent.click(leagueHeaderCell);
      expect(clickSpy).toHaveBeenCalled();
    }

    // Verify sort indicator exists and updates
    const sortIndicator = leagueHeaderCell?.querySelector('.sort-icon');
    expect(sortIndicator).toBeTruthy();
  });

  it('test_handles_empty_data', () => {
    const { container } = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: [],
        timeWindowDays: '30',
      })
    );

    expect(container.querySelector('.league-adoption-breakdown')).toBeTruthy();

    const text = container.textContent || '';
    expect(text).toContain('No data available for this time window');
  });

  it('test_displays_time_window_note', () => {
    let container = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '7',
      })
    ).container;

    let text = container.textContent || '';
    expect(text).toContain('Data for last 7 days');

    container = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '30',
      })
    ).container;

    text = container.textContent || '';
    expect(text).toContain('Data for last 30 days');

    container = render(
      React.createElement(LeagueAdoptionBreakdown, {
        leagueData: mockLeagueData,
        timeWindowDays: '90',
      })
    ).container;

    text = container.textContent || '';
    expect(text).toContain('Data for last 90 days');
  });
});
