import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgesState } from '../useEdgesState';
import { FlowNode, FlowEdge, createGameNode, GameNode } from '../../types/flowchart';

describe('useEdgesState', () => {
  const setupHook = (
    initialEdges: FlowEdge[] = [],
    initialNodes: FlowNode[] = []
  ) => {
    let edges = initialEdges;
    let nodes = initialNodes;

    const setEdges = vi.fn((update) => {
      edges = typeof update === 'function' ? update(edges) : update;
    });
    const setNodes = vi.fn((update) => {
      nodes = typeof update === 'function' ? update(nodes) : update;
    });

    const { result } = renderHook(
      () => useEdgesState(edges, setEdges, setNodes)
    );

    return {
      result,
      getEdges: () => edges,
      getNodes: () => nodes,
    };
  };

  const mockGame1 = createGameNode('game-1', { x: 0, y: 0 }, { standing: 'Game 1' });
  const mockGame2 = createGameNode('game-2', { x: 0, y: 0 }, { standing: 'Game 2' });

  describe('addGameToGameEdge', () => {
    it('creates an edge and updates target node data', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      act(() => {
        result.current.addGameToGameEdge('game-1', 'winner', 'game-2', 'home');
      });

      const edges = getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('game-1');
      expect(edges[0].target).toBe('game-2');

      const nodes = getNodes();
      const targetGame = nodes.find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toEqual({
        type: 'winner',
        matchName: 'Game 1'
      });
      expect(targetGame.data.homeTeamId).toBeNull();
    });
  });

  describe('addBulkGameToGameEdges', () => {
    it('creates multiple edges and updates nodes atomically', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      act(() => {
        result.current.addBulkGameToGameEdges([
          { sourceGameId: 'game-1', outputType: 'winner', targetGameId: 'game-2', targetSlot: 'home' },
          { sourceGameId: 'game-1', outputType: 'loser', targetGameId: 'game-2', targetSlot: 'away' },
        ]);
      });

      expect(getEdges()).toHaveLength(2);
      const targetGame = getNodes().find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic?.type).toBe('winner');
      expect(targetGame.data.awayTeamDynamic?.type).toBe('loser');
    });

    it('returns empty array if no edges to add', () => {
      const { result } = setupHook();
      let ids: string[] = [];
      act(() => {
        ids = result.current.addBulkGameToGameEdges([]);
      });
      expect(ids).toHaveLength(0);
    });
  });

  describe('removeGameToGameEdge', () => {
    it('removes edge and clears dynamic ref in node', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      act(() => {
        result.current.addGameToGameEdge('game-1', 'winner', 'game-2', 'home');
      });

      act(() => {
        result.current.removeEdgeFromSlot('game-2', 'home');
      });

      expect(getEdges()).toHaveLength(0);
      const targetGame = getNodes().find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toBeNull();
    });
  });

  describe('deleteEdge', () => {
    it('deletes edge by ID and cleans up target node', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      let edgeId = '';
      act(() => {
        edgeId = result.current.addGameToGameEdge('game-1', 'winner', 'game-2', 'home');
      });

      act(() => {
        result.current.deleteEdge(edgeId);
      });

      expect(getEdges()).toHaveLength(0);
      const targetGame = getNodes().find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toBeNull();
    });
  });

  describe('deleteEdgesByNodes', () => {
    it('removes all edges connected to specified nodes', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      act(() => {
        result.current.addGameToGameEdge('game-1', 'winner', 'game-2', 'home');
      });

      act(() => {
        result.current.deleteEdgesByNodes(['game-1']);
      });

      expect(getEdges()).toHaveLength(0);
      const targetGame = getNodes().find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toBeNull();
    });
  });

  describe('addStageToGameEdge', () => {
    it('creates a stage-to-game edge with rank reference', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Group Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result, getEdges, getNodes } = setupHook([], [mockStage, mockGame1]);

      let edgeId = '';
      act(() => {
        edgeId = result.current.addStageToGameEdge('stage-1', 1, 'game-1', 'home');
      });

      // Verify edge was created
      const edges = getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('stageToGame');
      expect(edges[0].source).toBe('stage-1');
      expect(edges[0].target).toBe('game-1');
      expect(edges[0].targetHandle).toBe('home');
      expect((edges[0].data as { sourceRank: number }).sourceRank).toBe(1);
      expect(edgeId).toBeTruthy();

      // Verify target game node was updated with dynamic reference
      const nodes = getNodes();
      const targetGame = nodes.find(n => n.id === 'game-1') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toEqual({
        type: 'rank',
        place: 1,
        stageId: 'stage-1',
        stageName: 'Group Stage'
      });
      expect(targetGame.data.homeTeamId).toBeNull();
    });

    it('creates edge for away slot', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Group Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result, getEdges, getNodes } = setupHook([], [mockStage, mockGame1]);

      act(() => {
        result.current.addStageToGameEdge('stage-1', 2, 'game-1', 'away');
      });

      const edges = getEdges();
      expect(edges[0].targetHandle).toBe('away');
      expect((edges[0].data as { sourceRank: number }).sourceRank).toBe(2);

      const nodes = getNodes();
      const targetGame = nodes.find(n => n.id === 'game-1') as unknown as GameNode;
      expect(targetGame.data.awayTeamDynamic).toEqual({
        type: 'rank',
        place: 2,
        stageId: 'stage-1',
        stageName: 'Group Stage'
      });
      expect(targetGame.data.awayTeamId).toBeNull();
    });

    it('handles different rank positions correctly', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Playoffs', category: 'final', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result, getNodes } = setupHook([], [mockStage, mockGame1]);

      act(() => {
        result.current.addStageToGameEdge('stage-1', 3, 'game-1', 'home');
      });

      const nodes = getNodes();
      const targetGame = nodes.find(n => n.id === 'game-1') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toEqual({
        type: 'rank',
        place: 3,
        stageId: 'stage-1',
        stageName: 'Playoffs'
      });
    });

    it('clears static team ID when setting rank reference', () => {
      const gameWithTeam = {
        ...mockGame1,
        data: { ...mockGame1.data, homeTeamId: 'team-123' }
      } as GameNode;

      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Group Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result, getNodes } = setupHook([], [mockStage, gameWithTeam]);

      act(() => {
        result.current.addStageToGameEdge('stage-1', 1, 'game-1', 'home');
      });

      const nodes = getNodes();
      const targetGame = nodes.find(n => n.id === 'game-1') as unknown as GameNode;
      expect(targetGame.data.homeTeamId).toBeNull();
      expect(targetGame.data.homeTeamDynamic).toBeTruthy();
    });
  });

  describe('syncNodesWithEdges', () => {
    it('re-synchronizes node data based on current edges', () => {
      const { result, getNodes } = setupHook([], [mockGame1, mockGame2]);
      const edges = [
        { id: 'e1', type: 'gameToGame', source: 'game-1', sourceHandle: 'winner', target: 'game-2', targetHandle: 'home' }
      ] as unknown as FlowEdge[];

      act(() => {
        result.current.syncNodesWithEdges([mockGame1, mockGame2], edges);
      });

      const targetGame = getNodes().find(n => n.id === 'game-2') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic?.matchName).toBe('Game 1');
    });

    it('synchronizes stage-to-game edges with rank references', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Ranking Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result, getNodes } = setupHook([], [mockStage, mockGame1]);
      const edges = [
        {
          id: 'e1',
          type: 'stageToGame',
          source: 'stage-1',
          sourceHandle: undefined,
          target: 'game-1',
          targetHandle: 'home',
          data: { sourceRank: 2 }
        }
      ] as unknown as FlowEdge[];

      act(() => {
        result.current.syncNodesWithEdges([mockStage, mockGame1], edges);
      });

      const targetGame = getNodes().find(n => n.id === 'game-1') as unknown as GameNode;
      expect(targetGame.data.homeTeamDynamic).toEqual({
        type: 'rank',
        place: 2,
        stageId: 'stage-1',
        stageName: 'Ranking Stage'
      });
    });
  });

  describe('deriveDynamicRef', () => {
    it('derives winner reference from game-to-game edge', () => {
      const { result } = setupHook([], [mockGame1, mockGame2]);
      const edge = {
        id: 'e1',
        type: 'gameToGame',
        source: 'game-1',
        sourceHandle: 'winner',
        target: 'game-2',
        targetHandle: 'home'
      } as FlowEdge;

      const ref = result.current.deriveDynamicRef(edge, [mockGame1, mockGame2]);
      expect(ref).toEqual({
        type: 'winner',
        matchName: 'Game 1'
      });
    });

    it('derives loser reference from game-to-game edge', () => {
      const { result } = setupHook([], [mockGame1, mockGame2]);
      const edge = {
        id: 'e1',
        type: 'gameToGame',
        source: 'game-1',
        sourceHandle: 'loser',
        target: 'game-2',
        targetHandle: 'away'
      } as FlowEdge;

      const ref = result.current.deriveDynamicRef(edge, [mockGame1, mockGame2]);
      expect(ref).toEqual({
        type: 'loser',
        matchName: 'Game 1'
      });
    });

    it('derives rank reference from stage-to-game edge', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Ranking Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as FlowNode;

      const { result } = setupHook([], [mockStage, mockGame1]);
      const edge = {
        id: 'e1',
        type: 'stageToGame',
        source: 'stage-1',
        target: 'game-1',
        targetHandle: 'home',
        data: { sourceRank: 3 }
      } as FlowEdge;

      const ref = result.current.deriveDynamicRef(edge, [mockStage, mockGame1]);
      expect(ref).toEqual({
        type: 'rank',
        place: 3,
        stageId: 'stage-1',
        stageName: 'Ranking Stage'
      });
    });

    it('returns null for missing source node', () => {
      const { result } = setupHook([], [mockGame1]);
      const edge = {
        id: 'e1',
        type: 'gameToGame',
        source: 'nonexistent',
        sourceHandle: 'winner',
        target: 'game-1',
        targetHandle: 'home'
      } as FlowEdge;

      const ref = result.current.deriveDynamicRef(edge, [mockGame1]);
      expect(ref).toBeNull();
    });
  });
});