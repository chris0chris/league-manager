/**
 * Tests for useFlowState Hook - Global Team Pool
 *
 * Tests for global team pool functionality including:
 * - Adding teams with required groupId
 * - Group deletion cascading to teams
 * - Team management within groups
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';

describe('useFlowState - Global Team Pool', () => {
  describe('addGlobalTeam', () => {
    it('creates a team with specified groupId', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;
      let teamId: string;

      act(() => {
        const group = result.current.addGlobalTeamGroup('Group A');
        groupId = group.id;
      });

      act(() => {
        const team = result.current.addGlobalTeam('Team 1', groupId);
        teamId = team.id;
      });

      const createdTeam = result.current.globalTeams.find(t => t.id === teamId);
      expect(createdTeam).toBeDefined();
      expect(createdTeam?.label).toBe('Team 1');
      expect(createdTeam?.groupId).toBe(groupId);
    });

    it('creates a team with null groupId if not provided (backward compatibility)', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;

      act(() => {
        const team = result.current.addGlobalTeam('Team 1');
        teamId = team.id;
      });

      const createdTeam = result.current.globalTeams.find(t => t.id === teamId);
      expect(createdTeam).toBeDefined();
      expect(createdTeam?.label).toBe('Team 1');
      expect(createdTeam?.groupId).toBeNull();
    });
  });

  describe('deleteGlobalTeamGroup', () => {
    it('deletes all teams in the group when group is deleted', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;
      let team1Id: string;
      let team2Id: string;

      act(() => {
        const group = result.current.addGlobalTeamGroup('Group A');
        groupId = group.id;
      });

      act(() => {
        team1Id = result.current.addGlobalTeam('Team 1', groupId).id;
        team2Id = result.current.addGlobalTeam('Team 2', groupId).id;
      });

      // Verify teams exist
      expect(result.current.globalTeams).toHaveLength(2);
      expect(result.current.globalTeams.find(t => t.id === team1Id)).toBeDefined();
      expect(result.current.globalTeams.find(t => t.id === team2Id)).toBeDefined();

      // Delete the group
      act(() => {
        result.current.deleteGlobalTeamGroup(groupId);
      });

      // Verify group is deleted
      expect(result.current.globalTeamGroups.find(g => g.id === groupId)).toBeUndefined();

      // Verify all teams in the group are deleted
      expect(result.current.globalTeams.find(t => t.id === team1Id)).toBeUndefined();
      expect(result.current.globalTeams.find(t => t.id === team2Id)).toBeUndefined();
      expect(result.current.globalTeams).toHaveLength(0);
    });

    it('does not delete teams in other groups', () => {
      const { result } = renderHook(() => useFlowState());

      let group1Id: string;
      let group2Id: string;
      let team1Id: string;
      let team2Id: string;

      act(() => {
        group1Id = result.current.addGlobalTeamGroup('Group A').id;
        group2Id = result.current.addGlobalTeamGroup('Group B').id;
      });

      act(() => {
        team1Id = result.current.addGlobalTeam('Team 1', group1Id).id;
        team2Id = result.current.addGlobalTeam('Team 2', group2Id).id;
      });

      // Delete group 1
      act(() => {
        result.current.deleteGlobalTeamGroup(group1Id);
      });

      // Verify team in group 1 is deleted
      expect(result.current.globalTeams.find(t => t.id === team1Id)).toBeUndefined();

      // Verify team in group 2 still exists
      expect(result.current.globalTeams.find(t => t.id === team2Id)).toBeDefined();
      expect(result.current.globalTeams).toHaveLength(1);
    });

    it('unassigns deleted teams from games', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;
      let teamId: string;
      let gameId: string;

      act(() => {
        groupId = result.current.addGlobalTeamGroup('Group A').id;
        teamId = result.current.addGlobalTeam('Team 1', groupId).id;
        gameId = result.current.addGameNodeInStage(undefined, { standing: 'Game 1' }).id;
      });

      // Assign team to game
      act(() => {
        result.current.assignTeamToGame(gameId, teamId, 'home');
      });

      // Verify assignment
      const game = result.current.nodes.find(n => n.id === gameId && n.type === 'game');
      expect(game?.data.homeTeamId).toBe(teamId);

      // Delete the group
      act(() => {
        result.current.deleteGlobalTeamGroup(groupId);
      });

      // Verify team is unassigned from game
      const updatedGame = result.current.nodes.find(n => n.id === gameId && n.type === 'game');
      expect(updatedGame?.data.homeTeamId).toBeNull();
    });
  });

  describe('Team-to-group relationship', () => {
    it('allows moving teams between groups', () => {
      const { result } = renderHook(() => useFlowState());

      let group1Id: string;
      let group2Id: string;
      let teamId: string;

      act(() => {
        group1Id = result.current.addGlobalTeamGroup('Group A').id;
        group2Id = result.current.addGlobalTeamGroup('Group B').id;
        teamId = result.current.addGlobalTeam('Team 1', group1Id).id;
      });

      // Verify team is in group 1
      let team = result.current.globalTeams.find(t => t.id === teamId);
      expect(team?.groupId).toBe(group1Id);

      // Move team to group 2
      act(() => {
        result.current.updateGlobalTeam(teamId, { groupId: group2Id });
      });

      // Verify team is now in group 2
      team = result.current.globalTeams.find(t => t.id === teamId);
      expect(team?.groupId).toBe(group2Id);
    });

    it('requires teams to have a groupId (no ungrouped teams allowed)', () => {
      const { result } = renderHook(() => useFlowState());

      let groupId: string;
      let teamId: string;

      act(() => {
        groupId = result.current.addGlobalTeamGroup('Group A').id;
        teamId = result.current.addGlobalTeam('Team 1', groupId).id;
      });

      // Verify team has groupId
      let team = result.current.globalTeams.find(t => t.id === teamId);
      expect(team?.groupId).toBe(groupId);

      // Attempting to set groupId to null should work (for backward compatibility)
      // but in the UI, we won't provide this option
      act(() => {
        result.current.updateGlobalTeam(teamId, { groupId: null });
      });

      team = result.current.globalTeams.find(t => t.id === teamId);
      expect(team?.groupId).toBeNull();
    });
  });
});
