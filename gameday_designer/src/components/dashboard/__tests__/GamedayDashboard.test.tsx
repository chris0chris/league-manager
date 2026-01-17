/**
 * Tests for GamedayDashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GamedayDashboard from '../GamedayDashboard';
import { gamedayApi } from '../../../api/gamedayApi';
import type { GamedayListEntry, PaginatedResponse } from '../../../types';

// Mock dependencies
vi.mock('../../../api/gamedayApi', () => ({
  gamedayApi: {
    listGamedays: vi.fn(),
    createGameday: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('GamedayDashboard', () => {
  const mockGamedays: GamedayListEntry[] = [
    {
      id: 1,
      name: 'Gameday 1',
      date: '2026-04-13',
      start: '10:00',
      format: '6_2',
      author: 1,
      address: 'Field 1',
      season: 1,
      league: 1,
      status: 'scheduled',
    },
    {
      id: 2,
      name: 'Gameday 2',
      date: '2026-04-20',
      start: '09:00',
      format: '5_2',
      author: 1,
      address: 'Field 2',
      season: 1,
      league: 1,
      status: 'draft',
    },
  ];

  const mockResponse: PaginatedResponse<GamedayListEntry> = {
    count: 2,
    next: null,
    previous: null,
    results: mockGamedays,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (gamedayApi.listGamedays as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
  });

  it('renders dashboard title and create button', async () => {
    render(<GamedayDashboard />);
    
    expect(screen.getByText('Gameday Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create gameday/i })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(gamedayApi.listGamedays).toHaveBeenCalled();
    });
  });

  it('renders gameday cards', async () => {
    render(<GamedayDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Gameday 1')).toBeInTheDocument();
      expect(screen.getByText('Gameday 2')).toBeInTheDocument();
    });
  });

  it('navigates to editor when clicking a card', async () => {
    render(<GamedayDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Gameday 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Gameday 1').closest('.card')!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/designer/1');
  });

  it('creates new gameday and navigates to editor', async () => {
    const newGameday = { id: 3, name: 'New Gameday' };
    (gamedayApi.createGameday as ReturnType<typeof vi.fn>).mockResolvedValue(newGameday);

    render(<GamedayDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /create gameday/i }));

    await waitFor(() => {
      expect(gamedayApi.createGameday).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/designer/3');
    });
  });
});
