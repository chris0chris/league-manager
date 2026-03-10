import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
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

describe('Auto-Clear on Generate Integration', () => {
  const mockGameday = {
    id: 1,
    name: 'Auto-Clear Test',
    date: '2026-06-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
    designer_data: {
      nodes: [
        { id: 'game-old', type: 'game', parentId: 'stage-old', data: { standing: 'Old Game', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'stage-old', type: 'stage', parentId: 'field-old', data: { name: 'Old Stage', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'field-old', type: 'field', data: { name: 'Old Field', order: 0 }, position: { x: 0, y: 0 } }
      ],
      edges: [],
      fields: [{ id: 'field-old', name: 'Old Field', order: 0 }],
      globalTeams: [
        { id: 't1', label: 'Team 1', color: '#000', order: 0, groupId: 'g1' },
        { id: 't2', label: 'Team 2', color: '#000', order: 1, groupId: 'g1' },
        { id: 't3', label: 'Team 3', color: '#000', order: 2, groupId: 'g1' },
        { id: 't4', label: 'Team 4', color: '#000', order: 3, groupId: 'g1' },
        { id: 't5', label: 'Team 5', color: '#000', order: 4, groupId: 'g1' },
        { id: 't6', label: 'Team 6', color: '#000', order: 5, groupId: 'g1' },
      ],
      globalTeamGroups: [{ id: 'g1', name: 'Group 1', order: 0 }],
    }
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(mockGameday as unknown as Awaited<ReturnType<typeof gamedayApi.getGameday>>);
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
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
    return { user };
  };

  it('RED: should clear existing structure when tournament is generated', async () => {
    const { user } = await renderApp();

    // Verify old structure exists
    expect(screen.getByText('Old Field')).toBeInTheDocument();
    expect(screen.getByText('Old Game')).toBeInTheDocument();

    // 1. Open Modal
    const generateBtn = await screen.findByTestId('generate-tournament-button');
    await user.click(generateBtn);

    // 2. Select Template
    const modal = await screen.findByRole('dialog');
    
    // 3. Generate
    const confirmBtn = within(modal).getByTestId('confirm-generate-button');
    await user.click(confirmBtn);

    // 4. Verify old structure is GONE and new structure is present
    await waitFor(() => {
      // Check for presence of some game rows (e.g. from default F6-2-2)
      // Actually F3-RR creates games like "Team 1 vs Team 2" etc.
      const gameRows = document.querySelectorAll('tr[id^="game-"]');
      expect(gameRows.length).toBeGreaterThan(0);
      
      // OLD STRUCTURE SHOULD BE GONE
      expect(screen.queryByText('Old Field')).toBeNull();
      expect(screen.queryByText('Old Game')).toBeNull();
    }, { timeout: 10000 });
  }, 30000);
});