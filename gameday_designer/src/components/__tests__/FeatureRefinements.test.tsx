
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { gamedayApi } from '../../api/gamedayApi';
import { GamedayMetadata } from '../../types';

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
    listSeasons: vi.fn().mockResolvedValue([{ id: 1, name: '2026' }]),
    listLeagues: vi.fn().mockResolvedValue([{ id: 1, name: 'DFFL' }]),
    searchTeams: vi.fn().mockResolvedValue([]),
  },
}));

describe('Feature Refinements Coverage', () => {
  const mockGameday = {
    id: 1,
    name: 'Refinement Test',
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
      globalTeams: [],
      globalTeamGroups: [],
    }
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(mockGameday as unknown as GamedayMetadata);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    return { user };
  };

  it('covers "Add External Officials" action', async () => {
    const { user } = await renderApp();

    const addOfficialsBtn = await screen.findByTestId('add-officials-button');
    await user.click(addOfficialsBtn);

    // Verify group was added to sidebar
    await waitFor(() => {
      expect(screen.getByText(/External Officials/i)).toBeInTheDocument();
    });
  });

  it('covers "Structured Template Export" action', async () => {
    // Mock gameday with data to enable export button
    const gamedayWithData = {
        ...mockGameday,
        designer_data: {
            ...mockGameday.designer_data,
            fields: [{ id: 'f1', name: 'Field 1', order: 0 }],
            nodes: [{ id: 'game-1', type: 'game', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } }]
        }
    };
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(gamedayWithData as unknown as GamedayMetadata);

    const { user } = await renderApp();

    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    
    const link = document.createElement('a');
    const clickSpy = vi.spyOn(link, 'click').mockImplementation(() => {});
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return link;
        return createElementOriginal(tagName);
    });

    // Find and click the toggle
    const dropdownToggle = screen.getByTestId('export-dropdown-toggle');
    
    // Wait for the button to be enabled (indicates data is loaded)
    await waitFor(() => {
        const exportBtn = screen.getByTestId('export-button');
        expect(exportBtn).not.toBeDisabled();
    }, { timeout: 5000 });

    // Click the toggle to open the menu
    await user.click(dropdownToggle);

    // Wait for dropdown to expand
    await waitFor(() => {
        expect(dropdownToggle.getAttribute('aria-expanded')).toBe('true');
    }, { timeout: 2000 });

    // Click template export item - wait longer for portal rendering
    const exportTemplateBtn = await screen.findByTestId('export-template-button');
    await user.click(exportTemplateBtn);

    // Verify export logic was triggered
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });

  it('covers HIDDEN "Auto-Clear" warning in GeneratorModal when NO data', async () => {
    const { user } = await renderApp();
    
    const generateBtn = (await screen.findAllByTestId('generate-tournament-button'))[0];
    await user.click(generateBtn);
    
    // Wait for modal to be definitely open
    await screen.findByRole('dialog');
    expect(screen.queryByText(/Auto-Clear/i)).toBeNull();
  });

  it('covers VISIBLE "Auto-Clear" warning in GeneratorModal when data EXISTS', async () => {
    // Mock gameday with existing fields/nodes
    const gamedayWithData = {
        ...mockGameday,
        designer_data: {
            ...mockGameday.designer_data,
            fields: [{ id: 'f1', name: 'Field 1', order: 0 }]
        }
    };
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(gamedayWithData as unknown as GamedayMetadata);
    
    const { user } = await renderApp();
    
    const generateBtn = (await screen.findAllByTestId('generate-tournament-button'))[0];
    await user.click(generateBtn);
    
    // Warning should be VISIBLE now - wait longer for portal
    const warning = await screen.findByText((content) => content.includes('Auto-Clear'), {}, { timeout: 5000 });
    expect(warning).toBeInTheDocument();
  });
});
