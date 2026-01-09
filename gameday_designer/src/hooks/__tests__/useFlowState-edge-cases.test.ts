/**
 * Tests for useFlowState Hook - Edge Cases
 *
 * TDD RED Phase: Tests for uncovered code paths and edge cases in useFlowState
 *
 * Coverage targets:
 * - ensureContainerHierarchy edge cases (selected field without stages)
 * - importState migration logic for old team format
 * - deleteGlobalTeamGroup with teams assigned to games
 * - getTeamUsage edge cases
 * - Edge cases in container hierarchy creation
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import {
  isFieldNode,
  isStageNode,
  isGameNode,
  GlobalTeam,
  GlobalTeamGroup,
} from '../../types/flowchart';
import type { FlowState } from '../../types/flowchart';

describe('useFlowState - Edge Cases', () => {
  describe('ensureContainerHierarchy - Edge Cases', () => {
    it('should create stage in selected field when field has no stages', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;

      // Create a field
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      // Select the field
      act(() => {
        result.current.selectNode(fieldId);
      });

      // Ensure container hierarchy should create a stage in the selected field
      let stageId: string;
      act(() => {
        const hierarchy = result.current.ensureContainerHierarchy();
        stageId = hierarchy.stageId;
        expect(hierarchy.fieldId).toBe(fieldId);
      });

      // Verify stage was created in the field
      const stage = result.current.nodes.find((n) => n.id === stageId && isStageNode(n));
      expect(stage).toBeDefined();
      expect(stage?.parentId).toBe(fieldId);
    });

    it('should return existing stage when field already has stages', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let existingStageId: string;

      // Create field
      act(() => {
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      // Create stage in field (separate act block to allow state update)
      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull(); // Verify stage was created
        existingStageId = stage!.id;
      });

      // Select the field
      act(() => {
        result.current.selectNode(fieldId);
      });

      const initialNodeCount = result.current.nodes.length;

      // Ensure container hierarchy should return the existing stage
      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      // Should return existing stage, not create a new one
      expect(hierarchy.fieldId).toBe(fieldId);
      expect(hierarchy.stageId).toBe(existingStageId);
      expect(result.current.nodes.length).toBe(initialNodeCount); // No new nodes created
    });

    it('should create stage in first field when no selection but field exists', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;

      // Create a field without stages
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      // Don't select anything
      act(() => {
        result.current.selectNode(null);
      });

      // Ensure container hierarchy should create a stage in the first field
      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      expect(hierarchy.fieldId).toBe(fieldId);
      const stage = result.current.nodes.find((n) => n.id === hierarchy.stageId && isStageNode(n));
      expect(stage).toBeDefined();
      expect(stage?.parentId).toBe(fieldId);
    });

    it('should create both field and stage when no containers exist', () => {
      const { result } = renderHook(() => useFlowState());

      // Start with no nodes
      expect(result.current.nodes).toHaveLength(0);

      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      // Should have created both field and stage
      const field = result.current.nodes.find((n) => n.id === hierarchy.fieldId && isFieldNode(n));
      const stage = result.current.nodes.find((n) => n.id === hierarchy.stageId && isStageNode(n));

      expect(field).toBeDefined();
      expect(stage).toBeDefined();
      expect(stage?.parentId).toBe(hierarchy.fieldId);
      expect(field?.data.name).toBe('Feld 1');
    });
  });

  describe('importState - Team Migration', () => {
    it('should migrate old team format (with reference) to new format (with groupId)', () => {
      const { result } = renderHook(() => useFlowState());

      // Old format state with "reference" field instead of "groupId"
      const oldFormatState: FlowState = {
        nodes: [],
        edges: [],
        fields: [],
        globalTeams: [
          {
            id: 'team-1',
            label: 'Team 1',
            reference: 'old-ref-1', // Old field
            order: 0,
          } as GlobalTeam & { reference?: string },
          {
            id: 'team-2',
            label: 'Team 2',
            reference: 'old-ref-2', // Old field
            order: 1,
          } as GlobalTeam & { reference?: string },
        ] as GlobalTeam[],
        globalTeamGroups: [],
      };

      act(() => {
        result.current.importState(oldFormatState);
      });

      // Teams should be migrated to new format with groupId: null
      expect(result.current.globalTeams).toHaveLength(2);
      expect(result.current.globalTeams[0]).toMatchObject({
        id: 'team-1',
        label: 'Team 1',
        groupId: null,
        order: 0,
      });
      expect(result.current.globalTeams[1]).toMatchObject({
        id: 'team-2',
        label: 'Team 2',
        groupId: null,
        order: 1,
      });

      // Old "reference" field should not exist
      expect(result.current.globalTeams[0]).not.toHaveProperty('reference');
    });

    it('should handle new format teams (with groupId) without migration', () => {
      const { result } = renderHook(() => useFlowState());

      const newFormatState: FlowState = {
        nodes: [],
        edges: [],
        fields: [],
        globalTeams: [
          {
            id: 'team-1',
            label: 'Team 1',
            groupId: 'group-1',
            order: 0,
          },
          {
            id: 'team-2',
            label: 'Team 2',
            groupId: null,
            order: 1,
          },
        ],
        globalTeamGroups: [
          {
            id: 'group-1',
            name: 'Group A',
            order: 0,
          },
        ],
      };

      act(() => {
        result.current.importState(newFormatState);
      });

      // Teams should remain unchanged
      expect(result.current.globalTeams).toHaveLength(2);
      expect(result.current.globalTeams[0]).toMatchObject({
        id: 'team-1',
        label: 'Team 1',
        groupId: 'group-1',
        order: 0,
      });
      expect(result.current.globalTeamGroups).toHaveLength(1);
    });

    it('should handle empty globalTeams in importState', () => {
      const { result } = renderHook(() => useFlowState());

      const stateWithoutTeams: FlowState = {
        nodes: [],
        edges: [],
        fields: [],
        globalTeams: undefined as unknown as GlobalTeam[], // Missing globalTeams
        globalTeamGroups: undefined as unknown as GlobalTeamGroup[], // Missing groups
      };

      act(() => {
        result.current.importState(stateWithoutTeams);
      });

      // Should handle undefined gracefully
      expect(result.current.globalTeams).toEqual([]);
      expect(result.current.globalTeamGroups).toEqual([]);
    });
  });

  describe('deleteGlobalTeamGroup - Cascade Delete with Game Assignments', () => {
    it('should unassign teams from games when deleting group', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;
      let team1Id: string;
      let team2Id: string;
      let gameId: string;

      // Create group with teams
      act(() => {
        groupId = result.current.addGlobalTeamGroup('Group A').id;
      });
      act(() => {
        team1Id = result.current.addGlobalTeam('Team 1', groupId).id;
      });
      act(() => {
        team2Id = result.current.addGlobalTeam('Team 2', groupId).id;
      });

      // Create game and assign teams from the group
      let fieldId: string;
      let stageId: string;
      act(() => {
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;

        result.current.assignTeamToGame(gameId, team1Id, 'home');
        result.current.assignTeamToGame(gameId, team2Id, 'away');
      });

      // Verify teams are assigned
      const gameBefore = result.current.nodes.find((n) => n.id === gameId && isGameNode(n));
      expect(gameBefore?.data.homeTeamId).toBe(team1Id);
      expect(gameBefore?.data.awayTeamId).toBe(team2Id);

      // Delete the group (should cascade delete teams and unassign from games)
      act(() => {
        result.current.deleteGlobalTeamGroup(groupId);
      });

      // Verify teams were deleted
      expect(result.current.globalTeams).toHaveLength(0);
      expect(result.current.globalTeamGroups).toHaveLength(0);

      // Verify game no longer has team assignments
      const gameAfter = result.current.nodes.find((n) => n.id === gameId && isGameNode(n));
      expect(gameAfter?.data.homeTeamId).toBeNull();
      expect(gameAfter?.data.awayTeamId).toBeNull();
    });

    it('should handle deleting group with no teams', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;

      // Create empty group
      act(() => {
        groupId = result.current.addGlobalTeamGroup('Empty Group').id;
      });

      // Delete the empty group
      act(() => {
        result.current.deleteGlobalTeamGroup(groupId);
      });

      // Group should be deleted
      expect(result.current.globalTeamGroups).toHaveLength(0);
    });

    it('should unassign teams only from affected games', () => {
      const { result } = renderHook(() => useFlowState());

      let group1Id: string;
      let group2Id: string;
      let team1Id: string;
      let team2Id: string;
      let team3Id: string;
      let game1Id: string;
      let game2Id: string;

      // Create two groups with teams
      act(() => {
        group1Id = result.current.addGlobalTeamGroup('Group 1').id;
      });
      act(() => {
        team1Id = result.current.addGlobalTeam('Team 1', group1Id).id;
      });
      act(() => {
        team2Id = result.current.addGlobalTeam('Team 2', group1Id).id;
      });

      act(() => {
        group2Id = result.current.addGlobalTeamGroup('Group 2').id;
      });
      act(() => {
        team3Id = result.current.addGlobalTeam('Team 3', group2Id).id;
      });

      // Create games
      let fieldId: string;
      let stageId: string;
      act(() => {
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId).id;
        game2Id = result.current.addGameNodeInStage(stageId).id;

        // Game 1: Teams from group 1
        result.current.assignTeamToGame(game1Id, team1Id, 'home');
        result.current.assignTeamToGame(game1Id, team2Id, 'away');

        // Game 2: Team from group 2
        result.current.assignTeamToGame(game2Id, team3Id, 'home');
      });

      // Delete group 1
      act(() => {
        result.current.deleteGlobalTeamGroup(group1Id);
      });

      // Game 1 should have no teams
      const game1After = result.current.nodes.find((n) => n.id === game1Id && isGameNode(n));
      expect(game1After?.data.homeTeamId).toBeNull();
      expect(game1After?.data.awayTeamId).toBeNull();

      // Game 2 should still have team 3
      const game2After = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));
      expect(game2After?.data.homeTeamId).toBe(team3Id);
      expect(game2After?.data.awayTeamId).toBeNull();

      // Group 2 and team 3 should still exist
      expect(result.current.globalTeamGroups).toHaveLength(1);
      expect(result.current.globalTeams).toHaveLength(1);
    });
  });

  describe('getTeamUsage - Edge Cases', () => {
    it('should return empty array when team is not used', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;

      act(() => {
        teamId = result.current.addGlobalTeam('Unused Team').id;
      });

      const usage = result.current.getTeamUsage(teamId);
      expect(usage).toEqual([]);
    });

    it('should return usage for team assigned to multiple games', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      let game1Id: string;
      let game2Id: string;
      let game3Id: string;

      let fieldId: string;
      let stageId: string;
      act(() => {
        teamId = result.current.addGlobalTeam('Popular Team').id;
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId).id;
        game2Id = result.current.addGameNodeInStage(stageId).id;
        game3Id = result.current.addGameNodeInStage(stageId).id;

        // Assign to multiple games in different slots
        result.current.assignTeamToGame(game1Id, teamId, 'home');
        result.current.assignTeamToGame(game2Id, teamId, 'away');
        result.current.assignTeamToGame(game3Id, teamId, 'home');
      });

      const usage = result.current.getTeamUsage(teamId);
      expect(usage).toHaveLength(3);
      expect(usage).toContainEqual({ gameId: game1Id, slot: 'home' });
      expect(usage).toContainEqual({ gameId: game2Id, slot: 'away' });
      expect(usage).toContainEqual({ gameId: game3Id, slot: 'home' });
    });

    it('should return usage for team in both home and away slots of same game', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      let gameId: string;

      let fieldId: string;
      let stageId: string;
      act(() => {
        teamId = result.current.addGlobalTeam('Dual Team').id;
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;

        // Assign same team to both slots (edge case - probably shouldn't happen but test the code)
        result.current.assignTeamToGame(gameId, teamId, 'home');
        result.current.assignTeamToGame(gameId, teamId, 'away');
      });

      const usage = result.current.getTeamUsage(teamId);
      expect(usage).toHaveLength(2);
      expect(usage).toContainEqual({ gameId, slot: 'home' });
      expect(usage).toContainEqual({ gameId, slot: 'away' });
    });
  });

  describe('deleteGlobalTeam - Edge Cases', () => {
    it('should handle deleting team assigned to multiple games', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      let game1Id: string;
      let game2Id: string;

      let fieldId: string;
      let stageId: string;
      act(() => {
        teamId = result.current.addGlobalTeam('Team to Delete').id;
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId).id;
        game2Id = result.current.addGameNodeInStage(stageId).id;

        result.current.assignTeamToGame(game1Id, teamId, 'home');
        result.current.assignTeamToGame(game2Id, teamId, 'away');
      });

      // Verify team is assigned
      expect(result.current.getTeamUsage(teamId)).toHaveLength(2);

      // Delete the team
      act(() => {
        result.current.deleteGlobalTeam(teamId);
      });

      // Team should be removed from globalTeams
      expect(result.current.globalTeams).toHaveLength(0);

      // Team should be unassigned from both games
      const game1 = result.current.nodes.find((n) => n.id === game1Id && isGameNode(n));
      const game2 = result.current.nodes.find((n) => n.id === game2Id && isGameNode(n));

      expect(game1?.data.homeTeamId).toBeNull();
      expect(game2?.data.awayTeamId).toBeNull();
    });

    it('should handle deleting team not assigned to any games', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;

      act(() => {
        teamId = result.current.addGlobalTeam('Unassigned Team').id;
      });

      act(() => {
        result.current.deleteGlobalTeam(teamId);
      });

      expect(result.current.globalTeams).toHaveLength(0);
    });
  });

  describe('Container Queries - Additional Edge Cases', () => {
    it('should return null for getGameField when game has no parent', () => {
      const { result } = renderHook(() => useFlowState());

      // Create a standalone game node (shouldn't happen in normal usage but test defensively)
      let gameId: string;
      act(() => {
        gameId = result.current.addGameNode().id;
      });

      const field = result.current.getGameField(gameId);
      expect(field).toBeNull();
    });

    it('should return null for getGameStage when game has no parent', () => {
      const { result } = renderHook(() => useFlowState());

      let gameId: string;
      act(() => {
        gameId = result.current.addGameNode().id;
      });

      const stage = result.current.getGameStage(gameId);
      expect(stage).toBeNull();
    });

    it('should cascade delete stage and game when field is deleted', () => {
      const { result } = renderHook(() => useFlowState());

      // Create field, stage, and game
      let fieldId: string;
      let stageId: string;
      let gameId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
      });

      // Verify everything exists
      expect(result.current.nodes.find((n) => n.id === fieldId)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === stageId)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === gameId)).toBeDefined();

      // Delete the field (should cascade delete stage and game)
      act(() => {
        result.current.deleteNode(fieldId);
      });

      // All should be gone
      expect(result.current.nodes.find((n) => n.id === fieldId)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === stageId)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === gameId)).toBeUndefined();
    });
  });

  describe('exportState - Completeness', () => {
    it('should export complete state including all container nodes', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        // Create complex state
        const field1 = result.current.addFieldNode({ name: 'Field 1' });
        fieldId = field1.id;
      });

      act(() => {
        const stage1 = result.current.addStageNode(fieldId, { name: 'Stage 1' });
        expect(stage1).not.toBeNull();
        stageId = stage1!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId);

        result.current.addGlobalTeamGroup('Group A');
        result.current.addGlobalTeam('Team 1');
      });

      const state = result.current.exportState();

      expect(state.nodes.length).toBeGreaterThan(0);
      expect(state.fields).toBeInstanceOf(Array);
      expect(state.globalTeams).toHaveLength(1);
      expect(state.globalTeamGroups).toHaveLength(1);
    });

    it('should export state with edges', () => {
      const { result } = renderHook(() => useFlowState());

      let game1Id: string;
      let game2Id: string;

      let fieldId: string;
      let stageId: string;
      act(() => {
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId).id;
        game2Id = result.current.addGameNodeInStage(stageId).id;

        result.current.addGameToGameEdge(game1Id, 'winner', game2Id, 'home');
      });

      const state = result.current.exportState();

      expect(state.edges).toHaveLength(1);
      expect(state.edges[0]).toMatchObject({
        source: game1Id,
        target: game2Id,
        sourceHandle: 'winner',
        targetHandle: 'home',
      });
    });
  });

  describe('clearAll - Comprehensive', () => {
    it('should clear all state including teams and groups', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        // Create comprehensive state
        const field = result.current.addFieldNode();
        fieldId = field.id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId);

        result.current.addGlobalTeamGroup('Group A');
        result.current.addGlobalTeam('Team 1');

        result.current.addField('Legacy Field');
      });

      expect(result.current.nodes.length).toBeGreaterThan(0);
      expect(result.current.globalTeams.length).toBeGreaterThan(0);
      expect(result.current.globalTeamGroups.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.nodes).toEqual([]);
      expect(result.current.edges).toEqual([]);
      expect(result.current.globalTeams).toEqual([]);
      expect(result.current.globalTeamGroups).toEqual([]);
      expect(result.current.selection).toEqual({ nodeIds: [], edgeIds: [] });

      // Fields are kept
      expect(result.current.fields.length).toBeGreaterThan(0);
    });
  });
});
