import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import { GamedayProvider } from '../../context/GamedayContext';
import { gamedayApi } from '../../api/gamedayApi';
import { useFlowState } from '../../hooks/useFlowState';
import { renderHook } from '@testing-library/react';
import { formatTeamReference, parseTeamReference, getTeamReferenceDisplayName } from '../../utils/teamReference';
import { validateForExport, exportToStructuredTemplate } from '../../utils/flowchartExport';
import { FlowState, GamedayMetadata, FlowNode, GameNode } from '../../types/flowchart';
import { GamedayListEntry } from '../../types';

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

describe('Coverage Expansion - ListDesignerApp & useFlowState', () => {
  const mockGameday: GamedayListEntry = {
    id: 1,
    name: 'Coverage Test',
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
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue(mockGameday);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('covers loadGameday failure and navigation', async () => {
    vi.mocked(gamedayApi.getGameday).mockRejectedValueOnce(new Error('Load Error'));
    
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
            <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );

    // Wait for error notification to appear, which indicates error handling has executed
    await waitFor(() => {
      expect(screen.getByText('Failed to load gameday')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Verify navigation to dashboard occurred
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

/*
  it('covers handleSaveResult NaN check', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
        ...mockGameday,
        status: 'PUBLISHED',
        designer_data: {
            ...mockGameday.designer_data,
            nodes: [
                { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
                { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
                { id: 'game-1', type: 'game', parentId: 's1', data: { standing: 'G1' }, position: { x: 0, y: 0 } }
            ]
        }
    } as unknown as GamedayListEntry);

    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );

    // Wait for load and find the game
    const gameRow = await screen.findByText('G1');
    expect(gameRow).toBeInTheDocument();

    // Trigger selection
    await act(async () => {
        await userEvent.click(gameRow);
    });
    
    // Result modal should appear. Find title.
    const modalTitle = await screen.findByText(/Enter Game Result/i);
    expect(modalTitle).toBeInTheDocument();
    
    const cancelBtn = screen.getByText(/Cancel/i);
    await userEvent.click(cancelBtn);
  });
*/

  it('covers manual officials group addition', async () => {
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );

    const addOfficialsBtn = await screen.findByTestId('add-officials-button');
    await userEvent.click(addOfficialsBtn);
    
    expect(await screen.findByText(/External Officials/i)).toBeInTheDocument();
  });

  describe('useFlowState logic coverage', () => {
    it('covers undo/redo logic', async () => {
      const { result } = renderHook(() => useFlowState());
      
      // Wait for initial history capture
      await waitFor(() => expect(result.current.exportState().metadata).toBeDefined());

      act(() => {
        result.current.updateMetadata({ name: 'Changed' });
      });
      
      expect(result.current.metadata.name).toBe('Changed');
      
      await waitFor(() => expect(result.current.canUndo).toBe(true));

      act(() => {
        result.current.undo();
      });
      expect(result.current.metadata.name).toBe('');
      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.redo();
      });
      expect(result.current.metadata.name).toBe('Changed');
    });

    it('covers deleteField cascading', () => {
      const { result } = renderHook(() => useFlowState());
      let fieldId = '';
      act(() => {
        const field = result.current.addField('F1');
        fieldId = field.id;
        result.current.addGameNode({ fieldId: field.id });
      });

      expect(result.current.fields).toHaveLength(1);
      expect((result.current.nodes[0] as GameNode).data.fieldId).toBe(fieldId);

      act(() => {
        result.current.deleteField(fieldId);
      });

      expect(result.current.fields).toHaveLength(0);
      expect((result.current.nodes[0] as GameNode).data.fieldId).toBeNull();
    });

    it('covers addBulkFields with clearExisting', () => {
        const { result } = renderHook(() => useFlowState());
        act(() => {
            result.current.addField('F1');
        });
        expect(result.current.fields).toHaveLength(1);

        act(() => {
            result.current.addBulkFields([{ id: 'f2', name: 'F2', order: 0 }], true);
        });
        expect(result.current.fields).toHaveLength(1);
        expect(result.current.fields[0].id).toBe('f2');
    });
  });

  describe('utils coverage', () => {
    it('covers teamReference formats (rank, groupRank)', () => {
      const rankRef = { type: 'rank', place: 1, stageName: 'Vorrunde', stageId: 's1' } as const;
      const groupRankRef = { type: 'groupRank', place: 2, groupName: 'A', stageName: 'Vorrunde', stageId: 's1' } as const;

      expect(formatTeamReference(rankRef)).toContain('Rank 1');
      expect(formatTeamReference(groupRankRef)).toContain('Rank 2 in A');

      expect(parseTeamReference('Rank 1 Vorrunde').type).toBe('rank');
      expect(parseTeamReference('Rank 2 in A of Vorrunde').type).toBe('groupRank');

      expect(getTeamReferenceDisplayName(rankRef)).toBeDefined();
      expect(getTeamReferenceDisplayName(groupRankRef)).toBeDefined();
    });

    it('covers validateForExport error cases', () => {
        const emptyState: FlowState = {
            nodes: [],
            edges: [],
            fields: [],
            globalTeams: [],
            globalTeamGroups: []
        };
        const errors = validateForExport(emptyState);
        expect(errors).toContain('At least one field is required');
        expect(errors).toContain('At least one game is required');

    const stateWithIncompleteGame: FlowState = {
        ...emptyState,
        metadata: mockGameday as unknown as GamedayMetadata,
        fields: [{ id: 'f1', name: 'F1', order: 0 }],
        nodes: [{ id: 'g1', type: 'game', data: { standing: '' }, position: { x: 0, y: 0 } } as unknown as FlowNode]
    };
    const errors2 = validateForExport(stateWithIncompleteGame);
    expect(errors2.some(e => e.includes('no standing'))).toBe(true);
    expect(errors2.some(e => e.includes('missing home team'))).toBe(true);
});

it('covers exportToStructuredTemplate fallbacks', () => {
    const state: FlowState = {
        metadata: { name: '' } as unknown as GamedayMetadata,
        nodes: [
            { id: 's1', type: 'stage', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } } as unknown as FlowNode,
            { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1' }, position: { x: 0, y: 0 } } as unknown as FlowNode
        ],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: []
    };
        const template = exportToStructuredTemplate(state);
        expect(template.metadata.name).toBe('Tournament Template');
        expect(template.stages[0].games[0].home.name).toBe('TBD');
    });
  });
});
