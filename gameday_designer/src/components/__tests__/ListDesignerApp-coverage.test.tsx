/**
 * Additional coverage tests for ListDesignerApp
 */

import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import { gamedayApi } from '../../api/gamedayApi';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup, FieldNode } from '../../types/flowchart';

// Mock the hook
vi.mock('../../hooks/useDesignerController');

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
    (gamedayApi.getGameday as Mock).mockRejectedValue(new Error('Load Error'));
    
    await renderApp();
    
    expect(mockHandlers.addNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load gameday'),
        'danger',
        'Error'
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles legacy fields loading', async () => {
    (gamedayApi.getGameday as Mock).mockResolvedValue({
        id: 1,
        designer_data: {
            fields: [{ id: 'f1', name: 'Field 1', order: 0 }]
        }
    });

    await renderApp();

    expect(defaultMockReturn.importState).toHaveBeenCalledWith(expect.objectContaining({
        fields: [{ id: 'f1', name: 'Field 1', order: 0 }]
    }));
  });

  it('handles publish success', async () => {
    (gamedayApi.publish as Mock).mockResolvedValue({ ...defaultMockReturn.metadata, status: 'PUBLISHED' });
    
    await renderApp();

    const publishBtn = screen.getByTestId('publish-schedule-button');
    fireEvent.click(publishBtn);

    const confirmBtn = screen.getByRole('button', { name: /publish now/i });
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

    const confirmBtn = screen.getByRole('button', { name: /publish now/i });
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
    vi.stubEnv('NODE_ENV', 'development');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-21T10:00:00Z'));
    
    (gamedayApi.patchGameday as Mock).mockRejectedValue(new Error('Save Error'));
    
    const { rerender } = render(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
    );
    
    // 1. Let loadGameday effects run
    await act(async () => {
        await Promise.resolve();
    });

    // 2. Advance time past the 2000ms pause from loadGameday
    await act(async () => {
        vi.advanceTimersByTime(3000);
    });

    // 3. Trigger FIRST real change to clear initialLoadRef.current
    const firstChange = {
        ...defaultMockReturn,
        metadata: { ...defaultMockReturn.metadata, name: 'Initial' },
        exportState: vi.fn().mockReturnValue({
            metadata: { id: 1, name: 'Initial' },
            nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: []
        })
    };
    (useDesignerController as Mock).mockReturnValue(firstChange);

    rerender(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
    );

    // Let the effect run to set initialLoadRef = false
    await act(async () => {
        vi.advanceTimersByTime(100);
    });

    // 4. Trigger SECOND change to actually schedule a save
    const secondChange = {
        ...defaultMockReturn,
        metadata: { ...defaultMockReturn.metadata, name: 'Changed' },
        exportState: vi.fn().mockReturnValue({
            metadata: { id: 1, name: 'Changed' },
            nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: []
        })
    };
    (useDesignerController as Mock).mockReturnValue(secondChange);

    rerender(
        <MemoryRouter initialEntries={['/designer/1']}>
          <GamedayProvider>
            <Routes>
              <Route path="/designer/:id" element={<ListDesignerApp />} />
            </Routes>
          </GamedayProvider>
        </MemoryRouter>
    );

    // 5. Advance time past the 1500ms debounce
    await act(async () => {
        vi.advanceTimersByTime(2000);
    });

    // 6. Handle async patchGameday call
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
});
