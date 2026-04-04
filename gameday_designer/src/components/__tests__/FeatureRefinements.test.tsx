import React from 'react';

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamedayProvider } from '../../context/GamedayContext';
import { gamedayApi } from '../../api/gamedayApi';
import i18n from '../../i18n/testConfig';
import { GamedayMetadata } from '../../types';


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
    getTemplates: vi.fn().mockResolvedValue([]),
    saveTemplate: vi.fn(),
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
  });

  const renderApp = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
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

  it('teams pool officials button creates an External Officials group', async () => {
    const { user } = await renderApp();

    // Only the teams pool button should exist — metadata button is removed
    const officialsBtns = screen.getAllByTestId('add-officials-button');
    expect(officialsBtns).toHaveLength(1);

    await user.click(officialsBtns[0]);

    // Should create the "External Officials" group, not an ungrouped team named "Officials"
    await screen.findByText('External Officials');
  });

});
