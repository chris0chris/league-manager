/**
 * Tests for GamedayDashboard Component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GamedayDashboard from '../GamedayDashboard';
import { GamedayProvider } from '../../../context/GamedayContext';
import i18n from '../../../i18n/testConfig';
import { gamedayApi } from '../../../api/gamedayApi';
import type { GamedayListEntry, PaginatedResponse } from '../../../types';

// Mock dependencies
vi.mock('../../../api/gamedayApi', () => ({
  gamedayApi: {
    listGamedays: vi.fn(),
    createGameday: vi.fn(),
    deleteGameday: vi.fn().mockResolvedValue({}),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/' }),
  };
});

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
      status: 'PUBLISHED',
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
      status: 'DRAFT',
    },
  ];

  const mockResponse: PaginatedResponse<GamedayListEntry> = {
    count: 2,
    next: null,
    previous: null,
    results: mockGamedays,
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    (gamedayApi.listGamedays as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
  });

  const renderDashboard = async (initialEntries = ['/']) => {
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <GamedayProvider>
          <GamedayDashboard />
        </GamedayProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  };

  it('renders dashboard subtitle and create button', async () => {
    await renderDashboard();
    // Subtitle is still there
    expect(screen.getByText(/manage your flag football tournament schedules/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Gameday/i })).toBeInTheDocument();
  });

  it('renders gameday cards', async () => {
    await renderDashboard();
    expect(screen.getByText('Gameday 1')).toBeInTheDocument();
    expect(screen.getByText('Gameday 2')).toBeInTheDocument();
  });

  it('navigates to editor when clicking a card', async () => {
    await renderDashboard();
    const card = screen.getByText('Gameday 1').closest('.card');
    fireEvent.click(card!);
    expect(mockNavigate).toHaveBeenCalledWith('/designer/1');
  });

  it('creates new gameday and navigates to editor', async () => {
    const newGameday = { id: 3, name: 'New Gameday' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(gamedayApi.createGameday).mockResolvedValue(newGameday as unknown as Parameters<typeof gamedayApi.createGameday>[0] extends any ? any : any);
    
    await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Create Gameday/i }));
    
    await waitFor(() => {
      expect(gamedayApi.createGameday).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/designer/3');
    });
  });

  it('filters gamedays when searching', async () => {
    await renderDashboard();

    const searchInput = screen.getByPlaceholderText(/search gamedays/i);
    fireEvent.change(searchInput, { target: { value: 'season:2026' } });

    await waitFor(() => {
      expect(gamedayApi.listGamedays).toHaveBeenCalledWith({ search: 'season:2026' });
    });
  });

  it('prevents deletion of published gamedays and shows info toast', async () => {
    await renderDashboard();
    
    // Gameday 1 is PUBLISHED
    const card1 = screen.getByText('Gameday 1').closest('.card');
    const deleteBtn = screen.getAllByTitle(/delete gameday/i)[0]; // Finds by translation title
    expect(deleteBtn).toBeInTheDocument();
    
    fireEvent.click(deleteBtn);
    
    // Deletion should NOT be called
    expect(gamedayApi.deleteGameday).not.toHaveBeenCalled();
    
    // Toast should show info message
    expect(screen.getByText(/published gamedays cannot be deleted/i)).toBeInTheDocument();
    // Should have a link to unlock
    expect(screen.getByRole('button', { name: /unlock schedule/i })).toBeInTheDocument();
  });

  it('allows deletion of draft gamedays', async () => {
    await renderDashboard();
    
    // Gameday 2 is DRAFT
    const deleteBtn = screen.getAllByTitle(/delete gameday/i)[1];
    
    fireEvent.click(deleteBtn);
    
    // Should show "Deleted" undo toast
    await waitFor(() => {
      // Flexible matcher for "Gameday \"Gameday 2\" deleted"
      expect(screen.getByText((content) => content.includes('deleted') && content.includes('Gameday 2'))).toBeInTheDocument();
    });
  });
});