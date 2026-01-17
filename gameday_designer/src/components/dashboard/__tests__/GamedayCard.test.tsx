/**
 * Tests for GamedayCard Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GamedayCard from '../GamedayCard';
import type { GamedayListEntry } from '../../../types';

describe('GamedayCard', () => {
  const mockGameday: GamedayListEntry = {
    id: 1,
    name: 'DFFL Gameday 1',
    date: '2026-04-13',
    start: '10:00',
    format: '6_2',
    author: 1,
    author_display: 'Admin',
    address: 'Sportpark Mitte',
    season: 1,
    season_display: 'Season 2026',
    league: 1,
    league_display: 'DFFL',
    status: 'scheduled'
  };

  it('renders gameday information correctly', () => {
    render(<GamedayCard gameday={mockGameday} onClick={vi.fn()} />);

    expect(screen.getByText('DFFL Gameday 1')).toBeInTheDocument();
    expect(screen.getByText('13.04.2026')).toBeInTheDocument(); // German format
    expect(screen.getByText('Season 2026')).toBeInTheDocument();
    expect(screen.getByText('DFFL')).toBeInTheDocument();
  });

  it('renders status badge correctly', () => {
    const { rerender } = render(
      <GamedayCard gameday={{ ...mockGameday, status: 'draft' }} onClick={vi.fn()} />
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(
      <GamedayCard gameday={{ ...mockGameday, status: 'scheduled' }} onClick={vi.fn()} />
    );
    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(
      <GamedayCard gameday={{ ...mockGameday, status: 'completed' }} onClick={vi.fn()} />
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<GamedayCard gameday={mockGameday} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button', { hidden: true })); // Card body or container
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(1);
  });
});
