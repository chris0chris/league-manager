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
    render(<GamedayCard gameday={mockGameday} onClick={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('DFFL Gameday 1')).toBeInTheDocument();
    expect(screen.getByText('13.04.2026')).toBeInTheDocument(); // German format
    expect(screen.getByText('Season 2026')).toBeInTheDocument();
    expect(screen.getByText('DFFL')).toBeInTheDocument();
    expect(screen.getByText('Sportpark Mitte')).toBeInTheDocument();
  });

  it('renders status badge correctly', () => {
    const { rerender } = render(
      <GamedayCard gameday={{ ...mockGameday, status: 'DRAFT' }} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    const draftBadge = screen.getByText('Draft');
    expect(draftBadge).toBeInTheDocument();
    expect(draftBadge).toHaveClass('bg-warning');

    rerender(
      <GamedayCard gameday={{ ...mockGameday, status: 'PUBLISHED' }} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    const pubBadge = screen.getByText('Published');
    expect(pubBadge).toBeInTheDocument();
    expect(pubBadge).toHaveClass('bg-success');

    rerender(
      <GamedayCard gameday={{ ...mockGameday, status: 'COMPLETED' }} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    const compBadge = screen.getByText('Completed');
    expect(compBadge).toBeInTheDocument();
    expect(compBadge).toHaveClass('bg-secondary');
  });

  it('calls onClick handler when card is clicked', () => {
    const handleClick = vi.fn();
    render(<GamedayCard gameday={mockGameday} onClick={handleClick} onDelete={vi.fn()} />);

    // The card has role="button", we can find it by its title content
    fireEvent.click(screen.getByText('DFFL Gameday 1')); 
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(1);
  });

  it('calls onDelete handler when delete button is clicked', () => {
    const handleDelete = vi.fn();
    render(<GamedayCard gameday={mockGameday} onClick={vi.fn()} onDelete={handleDelete} />);

    const deleteBtn = screen.getByTitle('Delete Gameday');
    
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(1);
  });
});
