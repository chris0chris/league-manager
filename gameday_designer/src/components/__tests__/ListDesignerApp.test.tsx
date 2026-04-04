import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { useDesignerController } from '../../hooks/useDesignerController';
import { useFlowState } from '../../hooks/useFlowState';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';
import { FieldNode } from '../../types/designer';

// Mock the controller hook
vi.mock('../../hooks/useDesignerController', () => ({
  useDesignerController: vi.fn(),
}));

vi.mock('../../hooks/useFlowState', () => ({
  useFlowState: vi.fn(),
}));

// Mock TeamSelectionModal to expose a trigger button for tests
vi.mock('../modals/TeamSelectionModal', () => ({
  default: ({ show, onSelect }: { show: boolean; onSelect: (t: { id: number; text: string }) => void }) =>
    show ? (
      <button data-testid="mock-team-select" onClick={() => onSelect({ id: 99, text: 'Replaced Team' })}>
        Select Team
      </button>
    ) : null,
}));

vi.mock('../LanguageSelector', () => ({
  default: () => <div data-testid="language-selector">LanguageSelector</div>,
}));

// Mock the API singleton
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn().mockResolvedValue({}),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateGameResult: vi.fn().mockResolvedValue({}),
    updateGameResultDetail: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([]),
    listLeagues: vi.fn().mockResolvedValue([]),
    getDesignerState: vi.fn().mockResolvedValue({ state_data: null }),
    updateDesignerState: vi.fn().mockResolvedValue({}),
    getTemplates: vi.fn().mockResolvedValue([]),
    saveTemplate: vi.fn(),
    publish: vi.fn().mockResolvedValue({}),
    patchGameday: vi.fn().mockResolvedValue({}),
    deleteGameday: vi.fn().mockResolvedValue({}),
  },
}));

const defaultFlowState = {
  nodes: [] as FlowNode[],
  edges: [] as FlowEdge[],
  fields: [] as FieldNode[],
  globalTeams: [] as GlobalTeam[],
  globalTeamGroups: [] as GlobalTeamGroup[],
  metadata: null,
  saveTrigger: 0,
  canUndo: false,
  canRedo: false,
  stats: { fieldCount: 0, gameCount: 0, teamCount: 0 },
  exportState: vi.fn().mockReturnValue({ nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] }),
  importState: vi.fn(),
  updateMetadata: vi.fn(),
  addGlobalTeam: vi.fn(),
  updateGlobalTeam: vi.fn(),
  deleteGlobalTeam: vi.fn(),
  replaceGlobalTeam: vi.fn(),
  reorderGlobalTeam: vi.fn(),
  addGlobalTeamGroup: vi.fn(),
  updateGlobalTeamGroup: vi.fn(),
  deleteGlobalTeamGroup: vi.fn(),
  reorderGlobalTeamGroup: vi.fn(),
  addOfficialsGroup: vi.fn(),
  addGameNode: vi.fn(),
  deleteNode: vi.fn(),
  selectNode: vi.fn(),
  clearAll: vi.fn(),
  clearSchedule: vi.fn(),
  addFieldNode: vi.fn(),
  addStageNode: vi.fn(),
  assignTeamToGame: vi.fn(),
  onNodesChange: vi.fn(),
  onEdgesChange: vi.fn(),
  removeEdgeFromSlot: vi.fn(),
  addGameNodeInStage: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
};

describe('ListDesignerApp', () => {
  const mockHandlers = {
    loadData: vi.fn().mockResolvedValue({}),
    saveData: vi.fn().mockResolvedValue({}),
    handleHighlightElement: vi.fn(),
    handleDynamicReferenceClick: vi.fn(),
    handleImport: vi.fn(),
    handleExport: vi.fn(),
    handleClearAll: vi.fn(),
    handleUpdateMetadata: vi.fn(),
    handleUpdateNode: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleAddFieldContainer: vi.fn(),
    handleAddStage: vi.fn(),
    handleSelectNode: vi.fn(),
    handleAddGlobalTeam: vi.fn(),
    handleUpdateGlobalTeam: vi.fn(),
    handleDeleteGlobalTeam: vi.fn(),
    handleReplaceGlobalTeam: vi.fn(),
    handleReorderGlobalTeam: vi.fn(),
    handleUpdateGlobalTeamGroup: vi.fn(),
    handleDeleteGlobalTeamGroup: vi.fn(),
    handleReorderGlobalTeamGroup: vi.fn(),
    handleAssignTeam: vi.fn(),
    handleConnectTeam: vi.fn(),
    handleSwapTeams: vi.fn(),
    handleUpdateGameSlot: vi.fn(),
    handleRemoveEdgeFromSlot: vi.fn(),
    handleGenerateTournament: vi.fn(),
    setShowTournamentModal: vi.fn(),
    dismissNotification: vi.fn(),
    addNotification: vi.fn(),
  };

  const defaultMockReturn = {
    metadata: { 
      id: 1, 
      name: "Test Gameday", 
      date: "2026-05-01", 
      start: "10:00", 
      format: "6_2", 
      author: 1, 
      address: "Test Field", 
      season: 1, 
      league: 1, 
      status: 'DRAFT' 
    },
    ui: {
      highlightedElement: null,
      expandedFieldIds: new Set<string>(),
      expandedStageIds: new Set<string>(),
      showTournamentModal: false,
      canExport: true,
      hasData: true,
      isLoading: false,
      notifications: [],
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      issueCount: 0
    },
    flowState: {
      nodes: [] as FlowNode[],
      edges: [] as FlowEdge[],
      fields: [] as FieldNode[],
      globalTeams: [] as GlobalTeam[],
      globalTeamGroups: [] as GlobalTeamGroup[],
      exportState: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
    },
    handlers: mockHandlers,
    canUndo: false,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
    stats: {
      gameCount: 0,
      teamCount: 0,
      fieldCount: 0
    }
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    (useFlowState as Mock).mockReturnValue(defaultFlowState);
    (useDesignerController as Mock).mockReturnValue(defaultMockReturn);
  });

  const renderApp = () => {
    return render(
      <GamedayProvider>
        <MemoryRouter initialEntries={['/designer/1']}>
          <AppHeader />
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </MemoryRouter>
      </GamedayProvider>
    );
  };

  it('should render the main app container', async () => {
    renderApp();
    expect(screen.getAllByText('Test Gameday').length).toBeGreaterThan(0);
  });

  it('should render application metadata in accordion', async () => {
    renderApp();
    expect(screen.getByDisplayValue('Test Gameday')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
  });

  describe('Validation Status Display', () => {
    it('should show "Valid" status when no errors or warnings', async () => {
      renderApp();
      const badges = screen.getByTestId('validation-badges');
      expect(badges.querySelector('.bg-success')).toBeInTheDocument();
    });

    it('should show error count when validation has errors', async () => {
      (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        validation: {
          isValid: false,
          errors: [{ id: '1', message: 'Test Error', type: 'error' }],
          warnings: [],
          issueCount: 1
        }
      });
      renderApp();
      const badges = screen.getByTestId('validation-badges');
      expect(badges.querySelector('.bg-danger')).toBeInTheDocument();
      expect(badges).toHaveTextContent('1');
    });
  });

  describe('Team replace flow', () => {
    it('routes replace mode to handleReplaceGlobalTeam, not handleAssignTeam', async () => {
      const team: GlobalTeam = { id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0, color: '#aaa' };
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Group A', order: 0 };
      (useFlowState as Mock).mockReturnValue({
        ...defaultFlowState,
        globalTeams: [team],
        globalTeamGroups: [group],
      });
      renderApp();

      // Open the move/replace dropdown on the team row
      const dropdownToggle = await screen.findByTitle(/Move this team to a different group/i);
      await act(async () => { dropdownToggle.click(); });

      // Click "Replace Team" inside the dropdown
      const replaceBtn = await screen.findByText('Replace Team');
      await act(async () => { replaceBtn.click(); });

      // The mocked modal renders a trigger button — click it to simulate team selection
      const selectBtn = screen.getByTestId('mock-team-select');
      await act(async () => { selectBtn.click(); });

      expect(mockHandlers.handleReplaceGlobalTeam).toHaveBeenCalledWith('team-1', { id: 99, text: 'Replaced Team' });
      expect(mockHandlers.handleAssignTeam).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export', () => {
    it('should call exportState when export is triggered', async () => {
      renderApp();
      const exportButton = screen.getByTestId('export-button');
      await act(async () => {
        exportButton.click();
      });
      expect(mockHandlers.handleExport).toHaveBeenCalled();
    });

    it('should call clearAll when clear is triggered', async () => {
      renderApp();
      // Open the accordion first to see the Clear button
      const accordionButton = screen.getByTestId('gameday-metadata-toggle');
      await act(async () => {
        accordionButton.click();
      });
      
      const clearButton = screen.getByTestId('clear-all-button');
      await act(async () => {
        clearButton.click();
      });
      expect(mockHandlers.handleClearAll).toHaveBeenCalled();
    });
  });
});
