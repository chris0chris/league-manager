/**
 * Tests for useTeamPoolState Hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamPoolState } from '../useTeamPoolState';
import { FlowNode, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';

describe('useTeamPoolState', () => {
  const setupHook = (
    initialTeams: GlobalTeam[] = [],
    initialGroups: GlobalTeamGroup[] = [],
    initialNodes: FlowNode[] = []
  ) => {
    let teams = initialTeams;
    let groups = initialGroups;
    let nodes = initialNodes;

    const setGlobalTeams = vi.fn((update) => {
      teams = typeof update === 'function' ? update(teams) : update;
    });
    const setGlobalTeamGroups = vi.fn((update) => {
      groups = typeof update === 'function' ? update(groups) : update;
    });
    const setNodes = vi.fn((update) => {
      nodes = typeof update === 'function' ? update(nodes) : update;
    });

    const { result, rerender } = renderHook(
      ({ teams, groups, nodes }) =>
        useTeamPoolState(teams, setGlobalTeams, groups, setGlobalTeamGroups, nodes, setNodes),
      { initialProps: { teams, groups, nodes } }
    );

    return {
      result,
      getTeams: () => teams,
      getGroups: () => groups,
      getNodes: () => nodes,
      rerender,
    };
  };

  describe('addGlobalTeam', () => {
    it('creates a team', () => {
      const { result, getTeams } = setupHook();

      act(() => {
        result.current.addGlobalTeam('Team 1');
      });

      const teams = getTeams();
      expect(teams).toHaveLength(1);
      expect(teams[0].label).toBe('Team 1');
    });
  });

  describe('addGlobalTeamGroup', () => {
    it('creates a group', () => {
      const { result, getGroups } = setupHook();

      act(() => {
        result.current.addGlobalTeamGroup('Group A');
      });

      const groups = getGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Group A');
    });
  });
});
