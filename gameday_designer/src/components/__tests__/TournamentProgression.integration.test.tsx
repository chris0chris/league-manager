import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
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
  },
}));

describe('Tournament Progression Integration', () => {
  const mockGameday = {
    id: 1,
    name: 'Progression Test',
    date: '2026-06-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
    designer_data: {
      nodes: [],
      edges: [],
      fields: [],
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
    (gamedayApi.getGameday as any).mockResolvedValue(mockGameday);
  });

  const renderApp = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    return { user };
  };

    it('should trigger edge creation when tournament is generated', async () => {

      const { user } = await renderApp();

  

      // 1. Open Modal

      const generateBtn = (await screen.findAllByRole('button', { name: /generate tournament/i }))[0];

      await user.click(generateBtn);

  

      // 2. Select Template (F6-2-2 is default)

      const modal = await screen.findByRole('dialog');

      

      // 3. Generate

      const confirmBtn = within(modal).getByRole('button', { name: /generate tournament/i });

      await user.click(confirmBtn);

  

          // 4. Verify edges exist in the footer statistics

  

          // Wait for auto-calculated edges to be processed by the hook

  

          await waitFor(() => {

  

            // 6 team template has many games and edges

  

            // Statistics footer uses translated label

  

            const statusBar = document.querySelector('.list-designer-app__status-bar');

  

            expect(statusBar?.textContent).toMatch(/[1-9]\d* Games/i);

  

          }, { timeout: 10000 });

  

      

    }, 30000);

  
});
