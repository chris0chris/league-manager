import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup, FieldNode } from '../../types/flowchart';

// Mock the hook
vi.mock('../../hooks/useDesignerController');

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/designer/1' }),
  };
});

// Mock LanguageSelector
vi.mock('../LanguageSelector', () => ({
  default: () => <div data-testid="language-selector">LanguageSelector</div>,
}));

// Mock GamedayApi
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Gameday',
      date: '2026-05-01',
      start: '10:00',
      format: '6_2',
      author: 1,
      address: 'Test Field',
      season: 1,
      league: 1,
      status: 'DRAFT',
    }),
    patchGameday: vi.fn().mockResolvedValue({}),
  },
}));

describe('ListDesignerApp', () => {
  const mockHandlers = {
    handleHighlightElement: vi.fn(),
    handleDynamicReferenceClick: vi.fn(),
    handleImport: vi.fn(),
    handleExport: vi.fn(),
    handleClearAll: vi.fn(),
    handleUpdateNode: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleAddFieldContainer: vi.fn(),
    handleAddStage: vi.fn(),
    handleSelectNode: vi.fn(),
    handleAddGlobalTeam: vi.fn(),
    handleUpdateGlobalTeam: vi.fn(),
    handleDeleteGlobalTeam: vi.fn(),
    handleReorderGlobalTeam: vi.fn(),
    handleAddGlobalTeamGroup: vi.fn(),
    handleAssignTeam: vi.fn(),
    handleGenerateTournament: vi.fn(),
    setShowTournamentModal: vi.fn(),
    dismissNotification: vi.fn(),
    addNotification: vi.fn(),
  };

  const defaultMockReturn = {
    metadata: { id: 1, name: "Test Gameday", date: "2026-05-01", start: "10:00", format: "6_2", author: 1, address: "Test Field", season: 1, league: 1, status: 'DRAFT' },
    nodes: [] as FlowNode[],
    edges: [] as FlowEdge[],
    fields: [] as FieldNode[],
    globalTeams: [] as GlobalTeam[],
    globalTeamGroups: [] as GlobalTeamGroup[],
    selectedNode: null,
    validation: { isValid: true, errors: [], warnings: [] },
    notifications: [],
    updateMetadata: vi.fn(),
    ui: {
      highlightedElement: null,
      expandedFieldIds: new Set(),
      expandedStageIds: new Set(),
      showTournamentModal: false,
      canExport: false,
      hasData: false,
    },
    handlers: mockHandlers,
    updateGlobalTeamGroup: vi.fn(),
    deleteGlobalTeamGroup: vi.fn(),
    reorderGlobalTeamGroup: vi.fn(),
    getTeamUsage: vi.fn(),
    addGameToGameEdge: vi.fn(),
    addStageToGameEdge: vi.fn(),
    removeEdgeFromSlot: vi.fn(),
    addGameNodeInStage: vi.fn(),
    importState: vi.fn(),
    exportState: vi.fn().mockReturnValue({
      metadata: {},
      nodes: [],
      edges: [],
      fields: [],
      globalTeams: [],
      globalTeamGroups: []
    }),
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    (useDesignerController as Mock).mockReturnValue(defaultMockReturn);
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
    // Wait for the gameday to load and spinner to go away
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
    // Ensure metadata is loaded
    await screen.findByTestId('gameday-metadata-header');
    return { user };
  };

  it('should render the main app container', async () => {
    await renderApp();
    expect(document.querySelector('.list-designer-app')).toBeInTheDocument();
  });

  it('should render application metadata in accordion', async () => {
    await renderApp();
    const metadataHeader = screen.getByTestId('gameday-metadata-header');
    expect(within(metadataHeader).getByText('Test Gameday')).toBeInTheDocument();
  });

  describe('Validation Status Display', () => {
    it('should show "Valid" status when no errors or warnings', async () => {
      await renderApp();
      const badges = screen.getByTestId('validation-badges');
      expect(badges.querySelector('.bi-check-circle-fill')).toBeInTheDocument();
    });

    it('should show error count when validation has errors', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        validation: { 
          isValid: false, 
          errors: [
            { id: '1', message: 'Error 1', type: 'error' },
            { id: '2', message: 'Error 2', type: 'error' }
          ], 
          warnings: [] 
        }
      });
      await renderApp();
      const badges = screen.getByTestId('validation-badges');
      expect(within(badges).getByText('2')).toBeInTheDocument();
    });
  });

  describe('Import/Export', () => {
    it('should call exportState when export is triggered', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        ui: { ...defaultMockReturn.ui, canExport: true }
      });
      const { user } = await renderApp();
      
      const exportBtn = screen.getByTestId('export-button');
      await waitFor(() => expect(exportBtn).not.toBeDisabled());
      await user.click(exportBtn);
      
      expect(mockHandlers.handleExport).toHaveBeenCalled();
    });

    it('should call clearAll when clear is triggered', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        ui: { ...defaultMockReturn.ui, hasData: true }
      });
      const { user } = await renderApp();
      
      const metadataHeader = screen.getByTestId('gameday-metadata-header');
      const accordionBtn = within(metadataHeader).getByRole('button');
      await user.click(accordionBtn);
      
      const clearBtn = await screen.findByRole('button', { name: /clear schedule/i });
      await user.click(clearBtn);
      
      expect(mockHandlers.handleClearAll).toHaveBeenCalled();
    });
  });
});