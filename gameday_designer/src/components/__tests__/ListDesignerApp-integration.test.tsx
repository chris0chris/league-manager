import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';

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

describe('ListDesignerApp - Integration Tests', () => {
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
    fields: [] as any[],
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
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
    await screen.findByTestId('gameday-metadata-header');
    return { user };
  };

  describe('Export Workflow', () => {
    it('should export state when canExport is true', async () => {
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

    it('should not allow export when no games or fields exist', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        ui: { ...defaultMockReturn.ui, canExport: false }
      });

      await renderApp();

      const exportBtn = screen.getByTestId('export-button');
      expect(exportBtn).toBeDisabled();
    });
  });

  describe('Import Workflow', () => {
    it('should call importState when valid JSON is imported', async () => {
      const { user } = await renderApp();
      const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
      const input = screen.getByTestId('import-file-input');

      await user.upload(input, file);
      expect(mockHandlers.handleImport).toHaveBeenCalled();
    });
  });

  describe('Callbacks and Handlers', () => {
    it('should show fields when they exist', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        nodes: [{ 
          id: 'field1', 
          type: 'field', 
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 }
        }]
      });
      
      await renderApp();
      await screen.findByText('Field 1');
    });
  });
});