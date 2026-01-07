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
        result.current.removeGameToGameEdge('game-2', 'home');
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
  });
});