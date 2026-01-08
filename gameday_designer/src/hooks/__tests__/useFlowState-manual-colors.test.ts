/**
 * Tests for useFlowState Hook - Manual Team Color Assignment
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import { TEAM_COLORS } from '../../utils/tournamentConstants';

describe('useFlowState - Manual Team Colors', () => {
  it('should automatically assign colors in rotation to manually added teams', () => {
    const { result } = renderHook(() => useFlowState());

    let groupId: string;

    act(() => {
      groupId = result.current.addGlobalTeamGroup('Group 1').id;
    });

    // Add 1st team
    act(() => {
      result.current.addGlobalTeam('Team 1', groupId);
    });
    expect(result.current.globalTeams[0].color).toBe(TEAM_COLORS[0]);

    // Add 4 more teams (total 5)
    act(() => {
      result.current.addGlobalTeam('Team 2', groupId);
    });
    act(() => {
      result.current.addGlobalTeam('Team 3', groupId);
    });
    act(() => {
      result.current.addGlobalTeam('Team 4', groupId);
    });
    act(() => {
      result.current.addGlobalTeam('Team 5', groupId);
    });
    
    expect(result.current.globalTeams[4].color).toBe(TEAM_COLORS[4]);

    // Add teams until we hit the limit (16)
    for (let i = 6; i <= 16; i++) {
      act(() => {
        result.current.addGlobalTeam(`Team ${i}`, groupId);
      });
    }
    expect(result.current.globalTeams[15].color).toBe(TEAM_COLORS[15]);

    // Add 17th team - should wrap around to 1st color
    act(() => {
      result.current.addGlobalTeam('Team 17', groupId);
    });
    expect(result.current.globalTeams[16].color).toBe(TEAM_COLORS[0]);
  });

  it('should preserve manual color overrides', () => {
    const { result } = renderHook(() => useFlowState());
    let groupId: string;
    let teamId: string;

    act(() => {
      groupId = result.current.addGlobalTeamGroup('Group 1').id;
      teamId = result.current.addGlobalTeam('Team 1', groupId).id;
    });

    // Initial auto-assigned color
    expect(result.current.globalTeams[0].color).toBe(TEAM_COLORS[0]);

    // Manually override color
    act(() => {
      result.current.updateGlobalTeam(teamId, { color: '#ffffff' });
    });
    expect(result.current.globalTeams[0].color).toBe('#ffffff');

    // Add another team - should still follow rotation based on count
    act(() => {
      result.current.addGlobalTeam('Team 2', groupId);
    });
    // 2nd team in pool (total teams was 1 when adding this)
    expect(result.current.globalTeams[1].color).toBe(TEAM_COLORS[1]);
  });
});
