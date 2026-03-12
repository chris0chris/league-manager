import React, { useEffect } from 'react';

// Extend window for test-only trigger helpers
declare global {
  interface Window {
    triggerGenerate?: () => void;
  }
}
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamedayProvider, useGamedayContext } from '../../context/GamedayContext';
import { gamedayApi } from '../../api/gamedayApi';
import i18n from '../../i18n/testConfig';
import { GamedayMetadata } from '../../types';

// Helper component to trigger actions from context
const ContextTrigger = () => {
  const { onGenerateTournament } = useGamedayContext();
  useEffect(() => {
    window.triggerGenerate = onGenerateTournament;
  }, [onGenerateTournament]);
  return null;
};

vi.mock('../LanguageSelector', () => ({
  default: () => <div data-testid="language-selector">LanguageSelector</div>,
}));

// Mock the API singleton
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
    getDesignerState: vi.fn().mockResolvedValue({ state_data: null }),
    updateDesignerState: vi.fn().mockResolvedValue({}),
    updateGameResultDetail: vi.fn().mockResolvedValue({}),
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
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(mockGameday as unknown as GamedayMetadata);
  });

  afterEach(() => {
    cleanup();
    delete window.triggerGenerate;
  });

  const renderApp = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <ContextTrigger />
          <AppHeader />
          <Routes>
            <Route path="/designer/:id" element={<div data-testid="app-container">
              <ListDesignerApp />
            </div>} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );
    // Wait for initial load to finish (LoadingOverlay should disappear)
    await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    }, { timeout: 10000 });
    return { user };
  };

  it('covers "Add External Officials" action', async () => {
    const { user } = await renderApp();

    // Open metadata accordion first
    const toggle = await screen.findByTestId('gameday-metadata-toggle');
    await user.click(toggle);

    const addOfficialsBtns = await screen.findAllByTestId('add-officials-button');
    await user.click(addOfficialsBtns[0]);

    // Verify group was added
    await screen.findByText(/Officials/i);
  });

  it('covers "Structured Template Export" action', async () => {
    const mockState = {
        fields: [{ id: 'f1', name: 'Field 1', order: 0 }],
        nodes: [{ id: 'game-1', type: 'game', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } }],
        edges: [],
        globalTeams: [],
        globalTeamGroups: []
    };
    
    vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({ state_data: mockState });

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
    const dropdownToggles = await screen.findAllByTestId('export-dropdown-toggle');
    
    // Wait for the button to be enabled (indicates data is loaded)
    await waitFor(() => {
        const exportBtns = screen.getAllByTestId('export-button');
        expect(exportBtns[0]).not.toBeDisabled();
    }, { timeout: 10000 });

    // Click the toggle to open the menu
    await user.click(dropdownToggles[0]);

    // Find and click "Export as Template" (renders as "Template (Structured)")
    const exportTemplateBtn = await screen.findByTestId('export-template-button');
    await user.click(exportTemplateBtn);

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('covers HIDDEN "Auto-Clear" warning in GeneratorModal when NO data', async () => {
    // Ensure no data is loaded (clearAllMocks does not reset mockResolvedValue)
    vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({ state_data: null });

    await renderApp();
    
    await act(async () => {
        const trigger = window.triggerGenerate;
        if (typeof trigger === 'function') trigger();
    });
    
    // Wait for modal content
    await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.queryByText(/Auto-Clear/i)).toBeNull();
  });

  it('covers VISIBLE "Auto-Clear" warning in GeneratorModal when data EXISTS', async () => {
    const mockState = {
        fields: [{ id: 'f1', name: 'Field 1', order: 0 }],
        nodes: [{ id: 'game-1', type: 'game', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } }],
        edges: [],
        globalTeams: [],
        globalTeamGroups: []
    };
    vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({ state_data: mockState });

    await renderApp();
    
    await act(async () => {
        const trigger = window.triggerGenerate;
        if (typeof trigger === 'function') trigger();
    });
    
    // Warning should be VISIBLE now
    await waitFor(() => {
        expect(screen.getByText(/Auto-Clear/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
