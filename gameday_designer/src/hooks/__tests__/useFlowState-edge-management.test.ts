/**
 * Tests for useFlowState Hook - Game-to-Game Edge Management
 *
 * TDD RED Phase: Tests for adding/removing GameToGameEdge connections.
 * These edges create dynamic team references (winner/loser) between games.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import { isGameNode } from '../../types/flowchart';
import type { GameNodeData } from '../../types/flowchart';

describe('useFlowState - Game-to-Game Edge Management', () => {
  describe('addGameToGameEdge', () => {
    it('creates a new GameToGameEdge from source to target game', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      // Setup: Create field, stage, and two games
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Act: Create edge from Game 1 (winner) to Game 2 (home slot)
      let edgeId: string;
      act(() => {
        edgeId = result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      // Assert: Edge was created
      const edges = result.current.edges;
      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe(edgeId);
      expect(edges[0].type).toBe('gameToGame');
      expect(edges[0].source).toBe(game1Id);
      expect(edges[0].target).toBe(game2Id);
      expect(edges[0].sourceHandle).toBe('winner');
      expect(edges[0].targetHandle).toBe('home');
    });

    it('clears static team assignment when edge is created', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;
      let teamId: string;

      // Setup: Create field, stage, two games, and a team
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });
      act(() => {
        teamId = result.current.addGlobalTeam('Team A').id;
      });

      // Assign static team to Game 2 home slot
      act(() => {
        result.current.assignTeamToGame(game2Id, teamId, 'home');
      });

      // Verify static assignment exists
      let game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).homeTeamId).toBe(teamId);

      // Act: Create dynamic edge to Game 2 home slot
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      // Assert: Static team assignment was cleared
      game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).homeTeamId).toBeNull();
    });

    it('sets homeTeamDynamic field when targeting home slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Act: Create winner edge to home slot
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      // Assert: homeTeamDynamic was set (via useEffect synchronization)
      const game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      const data = game2!.data as GameNodeData;
      expect(data.homeTeamDynamic).toEqual({
        type: 'winner',
        matchName: 'Game 1',
      });
      expect(data.awayTeamDynamic).toBeNull();
    });

    it('sets awayTeamDynamic field when targeting away slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Act: Create loser edge to away slot
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'loser', game2Id, 'away');
      });

      // Assert: awayTeamDynamic was set (via useEffect synchronization)
      const game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      const data = game2!.data as GameNodeData;
      expect(data.awayTeamDynamic).toEqual({
        type: 'loser',
        matchName: 'Game 1',
      });
      expect(data.homeTeamDynamic).toBeNull();
    });

    it('creates multiple edges from same source game', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;
      let game3Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
        game3Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 3' }).id;
      });

      // Act: Create two edges from Game 1 (winner to Game 2, loser to Game 3)
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
        result.current.addGameToGameEdge(game1Id, 'loser', game3Id, 'home');
      });

      // Assert: Both edges exist
      const edges = result.current.edges;
      expect(edges).toHaveLength(2);

      const winnerEdge = edges.find((e) => e.targetHandle === 'home' && e.target === game2Id);
      expect(winnerEdge).toBeDefined();
      expect(winnerEdge!.sourceHandle).toBe('winner');

      const loserEdge = edges.find((e) => e.targetHandle === 'home' && e.target === game3Id);
      expect(loserEdge).toBeDefined();
      expect(loserEdge!.sourceHandle).toBe('loser');
    });

    it('returns unique edge ID', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      let edgeId1: string;
      let edgeId2: string;

      act(() => {
        edgeId1 = result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
        edgeId2 = result.current.addGameToGameEdge(game1Id, 'loser', game2Id, 'away');
      });

      // Assert: IDs are unique
      expect(edgeId1).toBeDefined();
      expect(edgeId2).toBeDefined();
      expect(edgeId1).not.toBe(edgeId2);
      expect(edgeId1).toMatch(/^edge-/);
      expect(edgeId2).toMatch(/^edge-/);
    });
  });

  describe('removeGameToGameEdge', () => {
    it('removes edge targeting specific game slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Create edge
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      expect(result.current.edges).toHaveLength(1);

      // Act: Remove edge
      act(() => {
        result.current.removeGameToGameEdge(game2Id, 'home');
      });

      // Assert: Edge was removed
      expect(result.current.edges).toHaveLength(0);
    });

    it('clears homeTeamDynamic when removing edge from home slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Create edge
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      // Verify dynamic ref exists
      let game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).homeTeamDynamic).toBeTruthy();

      // Act: Remove edge
      act(() => {
        result.current.removeGameToGameEdge(game2Id, 'home');
      });

      // Assert: Dynamic ref was cleared
      game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).homeTeamDynamic).toBeNull();
    });

    it('clears awayTeamDynamic when removing edge from away slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Create edge
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'loser', game2Id, 'away');
      });

      // Verify dynamic ref exists
      let game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).awayTeamDynamic).toBeTruthy();

      // Act: Remove edge
      act(() => {
        result.current.removeGameToGameEdge(game2Id, 'away');
      });

      // Assert: Dynamic ref was cleared
      game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect((game2!.data as GameNodeData).awayTeamDynamic).toBeNull();
    });

    it('only removes edge for specified slot, not other slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });

      // Create edges for both home and away slots
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
        result.current.addGameToGameEdge(game1Id, 'loser', game2Id, 'away');
      });

      expect(result.current.edges).toHaveLength(2);

      // Act: Remove only home slot edge
      act(() => {
        result.current.removeGameToGameEdge(game2Id, 'home');
      });

      // Assert: Only away slot edge remains
      expect(result.current.edges).toHaveLength(1);
      expect(result.current.edges[0].targetHandle).toBe('away');

      const game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      const data = game2!.data as GameNodeData;
      expect(data.homeTeamDynamic).toBeNull();
      expect(data.awayTeamDynamic).toBeTruthy();
    });

    it('does nothing if no edge exists for specified slot', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
      });

      // Act: Try to remove non-existent edge
      act(() => {
        result.current.removeGameToGameEdge(game1Id, 'home');
      });

      // Assert: No errors, state unchanged
      expect(result.current.edges).toHaveLength(0);
    });
  });

  describe('Edge and static team interaction', () => {
    it('replacing dynamic edge with static team clears edge first', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;
      let teamId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 1' }).id;
        game2Id = result.current.addGameNodeInStage(stageId, { standing: 'Game 2' }).id;
      });
      act(() => {
        teamId = result.current.addGlobalTeam('Team A').id;
      });

      // Create dynamic edge
      act(() => {
        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      expect(result.current.edges).toHaveLength(1);

      // Act: Remove edge and assign static team
      // (This simulates user selecting static team from dropdown)
      act(() => {
        result.current.removeGameToGameEdge(game2Id, 'home');
        result.current.assignTeamToGame(game2Id, teamId, 'home');
      });

      // Assert: Edge removed, static team assigned
      expect(result.current.edges).toHaveLength(0);
      const game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      const data = game2!.data as GameNodeData;
      expect(data.homeTeamId).toBe(teamId);
      expect(data.homeTeamDynamic).toBeNull();
    });
  });
});
