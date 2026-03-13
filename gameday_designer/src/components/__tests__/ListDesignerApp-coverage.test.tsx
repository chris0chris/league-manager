/**
 * Additional coverage tests for ListDesignerApp
 */

import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import { useFlowState } from '../../hooks/useFlowState';
import { gamedayApi } from '../../api/gamedayApi';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup, FieldNode } from '../../types/flowchart';

// Mock the hooks
vi.mock('../../hooks/useDesignerController');
vi.mock('../../hooks/useFlowState');

const mockNavigate = vi.fn();
// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
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
    getGameday: vi.fn(),
    patchGameday: vi.fn(),
    publish: vi.fn(),
    updateGameResult: vi.fn(),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateBulkGameResults: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([]),
    listLeagues: vi.fn().mockResolvedValue([]),
    deleteGameday: vi.fn().mockResolvedValue({}),
  },
}));

describe('ListDesignerApp Coverage', () => {
  const mockFlowState = {
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
    exportState: vi.fn().mockReturnValue({
      metadata: { id: 1, name: 'Test Gameday', date: '2026-05-01', start: '10:00', format: '6_2', author: 1, address: 'Test Field', season: 1, league: 1, status: 'DRAFT' },
      nodes: [],
      edges: [],
      fields: [],
      globalTeams: [],
      globalTeamGroups: [],
    }),
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
    loadData: vi.fn().mockResolvedValue(undefined),
    saveData: vi.fn().mockResolvedValue(undefined),
  };

  const defaultMockReturn = {
    metadata: { id: 1, name: "Test Gameday", date: "2026-05-01", start: "10:00", format: "6_2", author: 1, address: "Test Field", season: 1, league: 1, status: 'DRAFT' },
    nodes: [] as FlowNode[],
    edges: [] as FlowEdge[],
    fields: [] as FieldNode[],
    globalTeams: [
        { id: 'team-1', label: 'Team A', color: '#3498db', groupId: 'group-1', order: 0 },
        { id: 'team-2', label: 'Team B', color: '#e74c3c', groupId: 'group-1', order: 1 }
    ] as GlobalTeam[],
    globalTeamGroups: [{ id: 'group-1', label: 'Group 1', order: 0 }] as GlobalTeamGroup[],
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
      metadata: { id: 1, name: "Test Gameday" },
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
    vi.useRealTimers();
    (useFlowState as Mock).mockReturnValue(mockFlowState);
    (useDesignerController as Mock).mockReturnValue(defaultMockReturn);
    (gamedayApi.getGameday as Mock).mockResolvedValue(defaultMockReturn.metadata);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
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

    // Hover on validation badges container
    const badges = screen.getByTestId('validation-badges');
    fireEvent.mouseEnter(badges);

    // Click on the error item in popover
    await waitFor(() => {
      const errorItem = screen.getByText('Overlap error');
      fireEvent.click(errorItem);
    });

    expect(mockHandlers.handleHighlightElement).toHaveBeenCalledWith('game1', 'game');
  });

  it('handles load gameday failure', async () => {
    (mockHandlers.loadData as Mock).mockRejectedValueOnce(new Error('Load Error'));

    await renderApp();

    expect(mockHandlers.addNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load gameday'),
        'danger',
        'Error'
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles publish success', async () => {
    (gamedayApi.publish as Mock).mockResolvedValue({ ...defaultMockReturn.metadata, status: 'PUBLISHED' });

    await renderApp();

    const publishBtn = screen.getByTestId('publish-schedule-button');
    fireEvent.click(publishBtn);

    // Modal should now be visible; click the confirm button
    const confirmBtn = await screen.findByRole('button', { name: /Publish Now/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
        expect(gamedayApi.publish).toHaveBeenCalledWith(1);
        expect(mockHandlers.addNotification).toHaveBeenCalledWith(
            expect.stringContaining('published and locked'),
            'success',
            'Success'
        );
    });
  });

  it('handles unlock success', async () => {
    (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        metadata: { ...defaultMockReturn.metadata, status: 'PUBLISHED' }
    });
    (gamedayApi.patchGameday as Mock).mockResolvedValue({ ...defaultMockReturn.metadata, status: 'DRAFT' });

    await renderApp();

    fireEvent.click(screen.getByTestId('gameday-metadata-header').querySelector('.accordion-button')!);
    
    const unlockBtn = screen.getByRole('button', { name: /unlock schedule/i });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
        expect(gamedayApi.patchGameday).toHaveBeenCalledWith(1, { status: 'DRAFT' });
        expect(mockHandlers.addNotification).toHaveBeenCalledWith(
            expect.stringContaining('unlocked for editing'),
            'success',
            'Success'
        );
    });
  });

  it('handles publish failure', async () => {
    (gamedayApi.publish as Mock).mockRejectedValue(new Error('Publish Error'));

    await renderApp();

    const publishBtn = screen.getByTestId('publish-schedule-button');
    fireEvent.click(publishBtn);

    // Modal should now be visible; click the confirm button
    const confirmBtn = await screen.findByRole('button', { name: /Publish Now/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
        expect(mockHandlers.addNotification).toHaveBeenCalledWith(
            expect.stringContaining('Failed to publish schedule'),
            'danger',
            'Error'
        );
    });
  });

  it('handles unlock failure', async () => {
    (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        metadata: { ...defaultMockReturn.metadata, status: 'PUBLISHED' }
    });
    (gamedayApi.patchGameday as Mock).mockRejectedValue(new Error('Unlock Error'));

    await renderApp();

    fireEvent.click(screen.getByTestId('gameday-metadata-header').querySelector('.accordion-button')!);
    
    const unlockBtn = screen.getByRole('button', { name: /unlock schedule/i });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
        expect(mockHandlers.addNotification).toHaveBeenCalledWith(
            expect.stringContaining('Failed to unlock schedule'),
            'danger',
            'Error'
        );
    });
  });

  it('handles game result modal names and hide', async () => {
    const mockField = { id: 'field-1', type: 'field', data: { name: 'Field 1', order: 0 } };
    const mockStage = { id: 'stage-1', type: 'stage', parentId: 'field-1', data: { name: 'Stage 1', order: 0 } };
    const mockGame = {
        id: 'game-1',
        type: 'game',
        parentId: 'stage-1',
        data: { homeTeamId: 'team-10', awayTeamId: 'team-20', standing: 'Game 1' }
    };
    const mockTeams = [
        { id: 'team-10', label: 'Team A', color: '#3498db', groupId: 'group-1', order: 0 },
        { id: 'team-20', label: 'Team B', color: '#e74c3c', groupId: 'group-1', order: 1 }
    ];

    (useFlowState as Mock).mockReturnValue({
        ...mockFlowState,
        nodes: [mockField, mockStage, mockGame],
        globalTeams: mockTeams,
    });
    (useDesignerController as Mock).mockReturnValue({
        ...defaultMockReturn,
        metadata: { ...defaultMockReturn.metadata, status: 'PUBLISHED' },
        nodes: [mockField, mockStage, mockGame],
        fields: [mockField],
        selectedNode: mockGame,
        globalTeams: mockTeams,
        ui: {
            ...defaultMockReturn.ui,
            expandedFieldIds: new Set(['field-1']),
            expandedStageIds: new Set(['stage-1'])
        }
    });
    (gamedayApi.getGameday as Mock).mockResolvedValue({ ...defaultMockReturn.metadata, status: 'PUBLISHED' });

    await renderApp();
    
    // Decoupled selection and modal: must explicitly open result modal now
    const resultBtn = await screen.findByTestId('enter-result-game-1');
    fireEvent.click(resultBtn);

    await waitFor(() => {
        expect(screen.getByText(/Game 1/i, { selector: '.modal-title' })).toBeInTheDocument();
        expect(screen.getAllByText(/Team A/i).length).toBeGreaterThan(0);
    });

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);

    expect(mockHandlers.handleSelectNode).toHaveBeenCalledWith(null);
  });

  it('handles auto-save failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-21T10:00:00Z'));

    // State recorded during the initial load (initialLoadRef sets lastSavedStateRef to this).
    const stateA = {
      metadata: { id: 1, name: 'Test Gameday', date: '2026-05-01', start: '10:00', format: '6_2', author: 1, address: 'Test Field', season: 1, league: 1, status: 'DRAFT' },
      nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [],
    };
    // State returned after a "change" — differs from stateA so the auto-save diff check passes.
    const stateB = { ...stateA, metadata: { ...stateA.metadata, name: 'Changed' } };

    // Configure saveData to reject so the error notification path is exercised.
    const rejectingSaveData = vi.fn().mockRejectedValue(new Error('Save Error'));
    const failingHandlers = { ...mockHandlers, saveData: rejectingSaveData };
    (useDesignerController as Mock).mockReturnValue({ ...defaultMockReturn, handlers: failingHandlers });

    // flowState A: initial load records stateA in lastSavedStateRef
    const flowStateA = { ...mockFlowState, exportState: vi.fn().mockReturnValue(stateA) };
    // flowState B: different reference; exportState returns stateB (≠ stateA) → triggers save
    const flowStateB = { ...mockFlowState, exportState: vi.fn().mockReturnValue(stateB) };

    (useFlowState as Mock).mockReturnValue(flowStateA);

    const { rerender } = render(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
    );

    // Let initial effects settle: initialLoadRef runs, records stateA, sets initialLoadRef=false.
    await act(async () => { await Promise.resolve(); });

    // Switch to flowStateB so next render gives a new flowState reference.
    // The auto-save effect re-runs because flowState changed.
    // exportState() returns stateB ≠ stateA → timer is scheduled with rejectingSaveData.
    (useFlowState as Mock).mockReturnValue(flowStateB);

    rerender(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
    );

    // Advance past the 1500ms debounce so the scheduled save timer fires.
    await act(async () => {
        vi.advanceTimersByTime(2500);
    });

    // Let the rejected saveData promise settle so the catch block runs.
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });

    expect(mockHandlers.addNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to auto-save'),
        'warning',
        'Auto-save'
    );
  });

  describe('BEH-002: scroll collapses accordion', () => {
    it('registers a passive scroll listener on window', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');

      render(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
      );

      const scrollCalls = addEventSpy.mock.calls.filter(([event]) => event === 'scroll');
      expect(scrollCalls.length).toBeGreaterThan(0);
      const lastScrollCall = scrollCalls[scrollCalls.length - 1];
      expect(lastScrollCall[2]).toEqual({ passive: true });

      addEventSpy.mockRestore();
    });

    it('removes the scroll listener on unmount', () => {
      const removeEventSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
      );

      unmount();

      const scrollRemovals = removeEventSpy.mock.calls.filter(([event]) => event === 'scroll');
      expect(scrollRemovals.length).toBeGreaterThan(0);

      removeEventSpy.mockRestore();
    });
  });

  describe('BEH-003: publish validation modal', () => {
    it('shows PublishConfirmationModal when publish is clicked, does not call API immediately', async () => {
      const user = userEvent.setup();
      await renderApp();

      const publishBtn = screen.getByTestId('publish-schedule-button');
      await user.click(publishBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(gamedayApi.publish).not.toHaveBeenCalled();
    });

    it('calls publish API when modal confirm is clicked', async () => {
      (gamedayApi.publish as Mock).mockResolvedValue({});
      const user = userEvent.setup();
      await renderApp();

      await user.click(screen.getByTestId('publish-schedule-button'));
      // Confirm button is enabled because defaultMockReturn has isValid: true
      const confirmBtn = screen.getByRole('button', { name: /Publish Now/i });
      await user.click(confirmBtn);

      await waitFor(() => expect(gamedayApi.publish).toHaveBeenCalledWith(1));
    });
  });

  describe('BEH-004: delete confirmation modal', () => {
    it('shows DeleteGamedayConfirmModal when delete is clicked, does not navigate immediately', async () => {
      const user = userEvent.setup();
      await renderApp();

      const deleteBtn = screen.getByTestId('delete-gameday-button');
      await user.click(deleteBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls deleteGameday API and navigates on confirm', async () => {
      (gamedayApi.deleteGameday as Mock).mockResolvedValue({});
      const user = userEvent.setup();
      await renderApp();

      await user.click(screen.getByTestId('delete-gameday-button'));
      
      const modal = screen.getByRole('dialog');
      // The button text is "Delete Gameday", same as title.
      // Use the button role to distinguish.
      const deleteButton = within(modal).getByRole('button', { name: /Delete Gameday/i });
      await user.click(deleteButton);

      await waitFor(() => expect(gamedayApi.deleteGameday).toHaveBeenCalledWith(1));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    });
  });

  describe('BEH-005: auto-save debounce', () => {
    it('fires saveData at 1500ms, not 2000ms', async () => {
      const stateA = { version: 1, nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] };
      const stateB = { version: 2, nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] };

      const flowStateA = { ...mockFlowState, exportState: vi.fn().mockReturnValue(stateA) };
      const flowStateB = { ...mockFlowState, exportState: vi.fn().mockReturnValue(stateB) };

      // Initial render uses flowStateA — initialLoadRef bails, records stateA
      (useFlowState as Mock).mockReturnValue(flowStateA);

      vi.useFakeTimers();

      const { rerender } = render(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
      );

      // Let initial effects settle so initialLoadRef is set to false
      await act(async () => { await Promise.resolve(); });

      // Switch to flowStateB — next render gives a different flowState reference
      // exportState() returns stateB ≠ stateA → auto-save timer is scheduled
      (useFlowState as Mock).mockReturnValue(flowStateB);

      rerender(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
      );

      // At 1499ms the save timer must not have fired yet
      await act(async () => { vi.advanceTimersByTime(1499); });
      expect(mockHandlers.saveData).not.toHaveBeenCalled();

      // At exactly 1500ms it must fire
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(mockHandlers.saveData).toHaveBeenCalled();
    });
  });
});
