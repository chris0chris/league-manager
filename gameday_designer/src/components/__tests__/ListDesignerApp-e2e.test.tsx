import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import { GamedayProvider } from '../../context/GamedayContext';
import AppHeader from '../layout/AppHeader';
import gamedayApi from '../../api/gamedayApi';
import { Gameday } from '../../types/api';

// Mock the API
vi.mock('../../api/gamedayApi', () => ({
  default: {
    getGameday: vi.fn(),
    listSeasons: vi.fn().mockResolvedValue([{ id: 1, name: '2024' }]),
    listLeagues: vi.fn().mockResolvedValue([{ id: 1, name: 'DFFL' }]),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateGameday: vi.fn(),
  },
}));

// Mock ResizeObserver which is used by some components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('ListDesignerApp E2E', () => {
  const mockGameday: Gameday = {
    id: 1,
    name: 'Test Gameday',
    date: '2024-01-01',
    start: '10:00:00',
    format: '6_2',
    author: 1,
    address: 'Test Venue',
    season: 1,
    season_display: '2024',
    league: 1,
    league_display: 'DFFL',
    status: 'DRAFT',
    designer_data: {
      nodes: [
        { id: 'f1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', data: { name: 'Preliminary Round', order: 0, splitCount: 1 }, parentId: 'f1', position: { x: 0, y: 0 } },
        { 
          id: 'g1', 
          type: 'game', 
          parentId: 's1', 
          data: { 
            standing: 'Game 1', 
            startTime: '10:00',
            home: { type: 'static', name: 'Team A' },
            away: { type: 'static', name: 'Team B' },
            official: { type: 'static', name: 'Team C' },
            breakAfter: 0
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: [],
      globalTeams: [],
      globalTeamGroups: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(mockGameday);
  });

  const renderApp = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <AppHeader />
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );
    // Wait for initial load - spinner gone
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
    return { user };
  };

  it('verifies the structure is rendered correctly', async () => {
    await renderApp();
    expect(screen.getByText(/Field 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Preliminary Round/i)).toBeInTheDocument();
    expect(screen.getByText(/Game 1/i)).toBeInTheDocument();
  });

  it('verifies results entry mode toggle', async () => {
    // Start in PUBLISHED state to show results button
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({ ...mockGameday, status: 'PUBLISHED' });
    
    const { user } = await renderApp();
    
    const resultsModeBtn = await screen.findByTestId('results-mode-button');
    await user.click(resultsModeBtn);
    
    // Verify results table is shown
    await waitFor(() => expect(screen.getByText(/Game Results/i)).toBeInTheDocument());
    
    // Toggle back to designer
    await user.click(resultsModeBtn);
    expect(screen.queryByText(/Game Results/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Fields$/)).toBeInTheDocument();
  });
});
