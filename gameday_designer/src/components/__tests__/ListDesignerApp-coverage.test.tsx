import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

describe('ListDesignerApp Coverage', () => {
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
  };

  it('handles clicking on error in popover', async () => {
    const mockValidation = {
      isValid: false,
      errors: [
        { id: 'err1', type: 'field_overlap', message: 'Overlap error', affectedNodes: ['game1'] }
      ],
      warnings: []
    };

    (useDesignerController as Mock).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    await renderApp();

    // Hover on error badge
    const badges = screen.getByTestId('validation-badges');
    fireEvent.mouseEnter(within(badges).getByText('1'));

    // Click on the error item in popover
    await waitFor(() => {
      const errorItem = screen.getByText('Overlap error');
      fireEvent.click(errorItem);
    });

    expect(mockHandlers.handleHighlightElement).toHaveBeenCalledWith('game1', 'game');
  });

  it('handles clicking on warning in popover', async () => {
    const mockValidation = {
      isValid: true,
      errors: [],
      warnings: [
        { id: 'warn1', type: 'stage_sequence_type', message: 'Stage warning', affectedNodes: ['stage1'] }
      ]
    };

    (useDesignerController as Mock).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    await renderApp();

    // Hover on warning badge
    const badges = screen.getByTestId('validation-badges');
    fireEvent.mouseEnter(within(badges).getByText('1'));

    // Click on the warning item in popover
    await waitFor(() => {
      const warningItem = screen.getByText('Stage warning');
      fireEvent.click(warningItem);
    });

    expect(mockHandlers.handleHighlightElement).toHaveBeenCalledWith('stage1', 'stage');
  });

  it('correctly maps highlight types for different error categories', async () => {
    const mockValidation = {
      isValid: false,
      errors: [
        { id: 'err1', type: 'team_overlap', message: 'Team overlap', affectedNodes: ['game1'] },
        { id: 'err2', type: 'stage_outside_field', message: 'Stage error', affectedNodes: ['stage1'] },
        { id: 'err3', type: 'field_overlap', message: 'Field error', affectedNodes: ['game2'] },
        { id: 'err4', type: 'team_outside_container', message: 'Team parent error', affectedNodes: ['team1'] },
      ],
      warnings: []
    };

    (useDesignerController as Mock).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    await renderApp();

    const badges = screen.getByTestId('validation-badges');
    fireEvent.mouseEnter(within(badges).getByText('4'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Team overlap'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('game1', 'game');

      fireEvent.click(screen.getByText('Stage error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('stage1', 'stage');

      fireEvent.click(screen.getByText('Field error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('game2', 'game');

      fireEvent.click(screen.getByText('Team parent error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('team1', 'team');
    });
  });
});