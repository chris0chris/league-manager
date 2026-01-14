/**
 * Tests for useEdgesState Hook
 *
 * TDD RED Phase: Tests for edge operations and node synchronization
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgesState } from '../useEdgesState';
import type { FlowNode, FlowEdge, GameNode, GameNodeData } from '../../types/flowchart';
import { createGameToGameEdge } from '../../types/flowchart';

describe('useEdgesState', () => {
  const setEdges = vi.fn();
  const setNodes = vi.fn();

  const mockGame1: GameNode = {
    id: 'game-1',
    type: 'game',
    position: { x: 0, y: 0 },
    data: { standing: 'Game 1' } as any,
  };

  const mockGame2: GameNode = {
    id: 'game-2',
    type: 'game',
    position: { x: 0, y: 0 },
    data: { standing: 'Game 2' } as any,
  };

  const initialEdges: FlowEdge[] = [
    {
      id: 'edge-1',
      type: 'gameToGame',
      source: 'game-1',
      target: 'game-2',
      sourceHandle: 'winner',
      targetHandle: 'home',
      data: { sourcePort: 'winner', targetPort: 'home' }
    } as FlowEdge,
  ];

  const setupHook = (initialEds: FlowEdge[] = [], initialNodes: FlowNode[] = []) => {
    let currentEdges = initialEds;
    let currentNodes = initialNodes;

    const mockSetEdges: any = (updater: any) => {
      currentEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      setEdges(currentEdges);
    };

    const mockSetNodes: any = (updater: any) => {
      currentNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      setNodes(currentNodes);
    };

    const renderResult = renderHook(() => useEdgesState(currentEdges, mockSetEdges, mockSetNodes));
    
    return {
      ...renderResult,
      getEdges: () => currentEdges,
      getNodes: () => currentNodes
    };
  };

  describe('deriveDynamicRef', () => {
    it('derives winner reference from game-to-game edge', () => {
      const { result } = setupHook([], [mockGame1]);
      const edge = initialEdges[0];
      const ref = result.current.deriveDynamicRef(edge, [mockGame1]);

      expect(ref).toEqual({ type: 'winner', matchName: 'Game 1' });
    });

    it('derives loser reference from game-to-game edge', () => {
      const { result } = setupHook([], [mockGame1]);
      const edge = { ...initialEdges[0], sourceHandle: 'loser' };
      const ref = result.current.deriveDynamicRef(edge, [mockGame1]);

      expect(ref).toEqual({ type: 'loser', matchName: 'Game 1' });
    });

    it('returns null for missing source node', () => {
      const { result } = setupHook();
      const edge = initialEdges[0];
      const ref = result.current.deriveDynamicRef(edge, []);

      expect(ref).toBeNull();
    });
  });

  describe('addGameToGameEdge', () => {
    it('creates a new GameToGameEdge and updates target node', () => {
      const { result, getEdges, getNodes } = setupHook([], [mockGame1, mockGame2]);

      let edgeId = '';
      act(() => {
        edgeId = result.current.addGameToGameEdge('game-1', 'winner', 'game-2', 'home');
      });

      expect(getEdges()).toHaveLength(1);
      expect(getEdges()[0].id).toBe(edgeId);
      expect(getEdges()[0].source).toBe('game-1');
      expect(getEdges()[0].target).toBe('game-2');

      const nodes = getNodes();
      const game2 = nodes.find(n => n.id === 'game-2') as unknown as GameNode;
      expect(game2.data.homeTeamDynamic).toEqual({ type: 'winner', matchName: 'Game 1' });
      expect(game2.data.homeTeamId).toBeNull();
    });
  });

  describe('removeEdgeFromSlot', () => {
    it('removes edge and clears dynamic ref in node', () => {
      const { result, getEdges, getNodes } = setupHook(initialEdges, [mockGame1, mockGame2]);

      act(() => {
        result.current.removeEdgeFromSlot('game-2', 'home');
      });

      expect(getEdges()).toHaveLength(0);
      const nodes = getNodes();
      const game2 = nodes.find(n => n.id === 'game-2') as unknown as GameNode;
      expect(game2.data.homeTeamDynamic).toBeNull();
    });
  });

  describe('deleteEdge', () => {
    it('deletes edge by ID and cleans up target node', () => {
      const { result, getEdges, getNodes } = setupHook(initialEdges, [mockGame1, mockGame2]);

      act(() => {
        result.current.deleteEdge('edge-1');
      });

      expect(getEdges()).toHaveLength(0);
      const nodes = getNodes();
      const game2 = nodes.find(n => n.id === 'game-2') as unknown as GameNode;
      expect(game2.data.homeTeamDynamic).toBeNull();
    });
  });

  describe('deleteEdgesByNodes', () => {
    it('removes all edges connected to specified nodes', () => {
      const { result, getEdges } = setupHook(initialEdges, [mockGame1, mockGame2]);

      act(() => {
        result.current.deleteEdgesByNodes(['game-1']);
      });

      expect(getEdges()).toHaveLength(0);
    });
  });

  describe('syncNodesWithEdges', () => {
    it('re-synchronizes node data based on current edges', () => {
      const { result, getNodes } = setupHook([], [mockGame1, mockGame2]);

      const edges: FlowEdge[] = [
        createGameToGameEdge('edge-1', 'game-1', 'winner', 'game-2', 'home')
      ];

      act(() => {
        result.current.syncNodesWithEdges([mockGame1, mockGame2], edges);
      });

      const nodes = getNodes();
      const game2 = nodes.find(n => n.id === 'game-2') as unknown as GameNode;
      expect(game2.data.homeTeamDynamic).toEqual({ type: 'winner', matchName: 'Game 1' });
    });

    it('syncNodesWithEdges: returns same node if dynamic refs are already correct (memoization)', () => {
      const gameWithDynamic = {
        ...mockGame2,
        data: {
          ...mockGame2.data,
          homeTeamDynamic: { type: 'winner', matchName: 'Game 1' }
        }
      } as unknown as GameNode;

      const { result, getNodes } = setupHook([], [mockGame1, gameWithDynamic]);

      const edges: FlowEdge[] = [
        createGameToGameEdge('edge-1', 'game-1', 'winner', 'game-2', 'home')
      ];

      act(() => {
        result.current.syncNodesWithEdges([mockGame1, gameWithDynamic], edges);
      });

      // If it returned same node, it means line 56 was hit (the return node branch)
      const nodes = getNodes();
      expect(nodes[1]).toBe(gameWithDynamic); 
    });
  });

  describe('addStageToGameEdge', () => {
    it('creates a stage-to-game edge with rank reference', () => {
      const mockStage = {
        id: 'stage-1',
        type: 'stage',
        position: { x: 0, y: 0 },
        data: { name: 'Group Stage', category: 'preliminary', order: 0, stageType: 'RANKING' },
      } as any;

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
  });
});
