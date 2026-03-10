import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import { gamedayApi } from '../../api/gamedayApi';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock gamedayApi
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn(),
    publish: vi.fn(),
    patchGameday: vi.fn(),
    deleteGameday: vi.fn(),
    updateGameResult: vi.fn(),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateBulkGameResults: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([]),
    listLeagues: vi.fn().mockResolvedValue([]),
  },
}));

describe('ListDesignerApp - E2E CRUD Flow', () => {
  const mockGameday = {
    id: 1,
    name: 'E2E Test Gameday',
    date: '2026-06-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'E2E Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
    designer_data: {
      nodes: [
        { id: 'field-1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'stage-1', type: 'stage', parentId: 'field-1', data: { name: 'Preliminary Round', category: 'preliminary', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'game-1', type: 'game', parentId: 'stage-1', data: { standing: 'Game 1', order: 0 }, position: { x: 0, y: 0 } }
      ],
      edges: [],
      fields: [
        { id: 'field-1', name: 'Field 1', order: 0 }
      ],
      globalTeams: [],
      globalTeamGroups: []
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({ ...mockGameday });
    vi.mocked(gamedayApi.getGamedayGames).mockResolvedValue([]);
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
