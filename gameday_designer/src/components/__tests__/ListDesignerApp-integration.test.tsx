import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import { useFlowState } from '../../hooks/useFlowState';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup, FieldNode } from '../../types/flowchart';

// Mock the hooks
vi.mock('../../hooks/useDesignerController');
vi.mock('../../hooks/useFlowState');

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
    }),
    patchGameday: vi.fn().mockResolvedValue({}),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateBulkGameResults: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([{ id: 1, name: 'Season 1' }]),
    listLeagues: vi.fn().mockResolvedValue([{ id: 1, name: 'League 1' }]),
    getDesignerState: vi.fn().mockResolvedValue(null),
    updateDesignerState: vi.fn().mockResolvedValue({}),
  },
}));

const defaultFlowState = {
  nodes: [] as FlowNode[],
  edges: [] as FlowEdge[],
  fields: [] as FieldNode[],
  globalTeams: [] as GlobalTeam[],
  globalTeamGroups: [] as GlobalTeamGroup[],
  selectedNode: null,
  selection: { nodeIds: [], edgeIds: [] },
  saveTrigger: 0,
  canUndo: false,
  canRedo: false,
  stats: { fieldCount: 0, gameCount: 0, teamCount: 0 },
  exportState: vi.fn().mockReturnValue({ nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] }),
  importState: vi.fn(),
  updateMetadata: vi.fn(),
  addField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
  addGameNode: vi.fn(),
  deleteNode: vi.fn(),
  selectNode: vi.fn(),
  clearAll: vi.fn(),
  clearSchedule: vi.fn(),
  addFieldNode: vi.fn(),
  addStageNode: vi.fn(),
  addBulkTournament: vi.fn(),
  addBulkGames: vi.fn(),
  addBulkFields: vi.fn(),
  addGlobalTeam: vi.fn(),
  updateGlobalTeam: vi.fn(),
  deleteGlobalTeam: vi.fn(),
  reorderGlobalTeam: vi.fn(),
  addGlobalTeamGroup: vi.fn(),
  assignTeamToGame: vi.fn(),
  ensureOfficialsGroup: vi.fn(),
  addOfficialsGroup: vi.fn(),
  updateNode: vi.fn(),
  getTargetStage: vi.fn().mockReturnValue(null),
  ensureContainerHierarchy: vi.fn().mockReturnValue({ fieldId: '', stageId: '' }),
  getGameField: vi.fn().mockReturnValue(null),
  getGameStage: vi.fn().mockReturnValue(null),
  getFieldStages: vi.fn().mockReturnValue([]),
  getStageGames: vi.fn().mockReturnValue([]),
  getTeamField: vi.fn().mockReturnValue(null),
  getTeamStage: vi.fn().mockReturnValue(null),
  getTeamUsage: vi.fn().mockReturnValue({ games: [] }),
  onNodesChange: vi.fn(),
  onEdgesChange: vi.fn(),
  setSelection: vi.fn(),
  setEdges: vi.fn(),
  addGameToGameEdge: vi.fn(),
  addBulkGameToGameEdges: vi.fn(),
  addStageToGameEdge: vi.fn(),
  removeEdgeFromSlot: vi.fn(),
  addGameNodeInStage: vi.fn(),
  moveNodeToStage: vi.fn(),
  matchNames: [],
  groupNames: [],
  selectedContainerField: null,
  selectedContainerStage: null,
  undo: vi.fn(),
  redo: vi.fn(),
};

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
    handleSwapTeams: vi.fn(),
    handleGenerateTournament: vi.fn(),
    setShowTournamentModal: vi.fn(),
    dismissNotification: vi.fn(),
    addNotification: vi.fn(),
    loadData: vi.fn().mockResolvedValue(undefined),
    saveData: vi.fn().mockResolvedValue(undefined),
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
    (useFlowState as Mock).mockReturnValue(defaultFlowState);
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
      await waitFor(() => expect(mockHandlers.handleImport).toHaveBeenCalled());
    });
  });

  describe('Callbacks and Handlers', () => {
    it('should show fields when they exist', async () => {
      const fieldNode = {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      };
      (useFlowState as Mock).mockReturnValue({
        ...defaultFlowState,
        nodes: [fieldNode],
      });
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        nodes: [fieldNode],
      });

      await renderApp();
      await screen.findByText('Field 1');
    });
  });
});