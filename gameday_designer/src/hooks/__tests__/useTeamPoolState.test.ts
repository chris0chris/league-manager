/**
 * Tests for useTeamPoolState Hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamPoolState } from '../useTeamPoolState';
import { FlowNode, GlobalTeam, GlobalTeamGroup, createGameNode } from '../../types/flowchart';

describe('useTeamPoolState', () => {
  describe('core team operations', () => {
    it('creates, updates and deletes a team', () => {
      let teams: GlobalTeam[] = [];
      const setGlobalTeams = vi.fn((update) => {
        teams = typeof update === 'function' ? update(teams) : update;
      });
      
      const { result, rerender } = renderHook(
        ({ teams }) => useTeamPoolState(teams, setGlobalTeams, [], vi.fn(), [], vi.fn()),
        { initialProps: { teams } }
      );

      // Add
      act(() => {
        result.current.addGlobalTeam('Team 1');
      });
      rerender({ teams });
      expect(teams).toHaveLength(1);
      const teamId = teams[0].id;

      // Update
      act(() => {
        result.current.updateGlobalTeam(teamId, { label: 'Updated' });
      });
      rerender({ teams });
      expect(teams[0].label).toBe('Updated');

      // Delete
      act(() => {
        result.current.deleteGlobalTeam(teamId);
      });
      rerender({ teams });
      expect(teams).toHaveLength(0);
    });

    it('reorders teams using up/down', () => {
      let teams: GlobalTeam[] = [
        { id: 't1', label: 'T1', groupId: null, order: 0 },
        { id: 't2', label: 'T2', groupId: null, order: 1 },
      ];
      const setGlobalTeams = vi.fn((update) => {
        teams = typeof update === 'function' ? update(teams) : update;
      });

      const { result, rerender } = renderHook(
        ({ teams }) => useTeamPoolState(teams, setGlobalTeams, [], vi.fn(), [], vi.fn()),
        { initialProps: { teams } }
      );

      // Move t2 up
      act(() => {
        result.current.reorderGlobalTeam('t2', 'up');
      });
      rerender({ teams });
      
      const sorted = [...teams].sort((a, b) => a.order - b.order);
      expect(sorted[0].id).toBe('t2');
      expect(sorted[1].id).toBe('t1');

      // Move t2 down
      act(() => {
        result.current.reorderGlobalTeam('t2', 'down');
      });
      rerender({ teams });
      
      const sorted2 = [...teams].sort((a, b) => a.order - b.order);
      expect(sorted2[0].id).toBe('t1');
      expect(sorted2[1].id).toBe('t2');
    });
  });

  describe('group operations', () => {
    it('creates, updates and deletes a group', () => {
      let groups: GlobalTeamGroup[] = [];
      const setGlobalTeamGroups = vi.fn((update) => {
        groups = typeof update === 'function' ? update(groups) : update;
      });

      const { result, rerender } = renderHook(
        ({ groups }) => useTeamPoolState([], vi.fn(), groups, setGlobalTeamGroups, [], vi.fn()),
        { initialProps: { groups } }
      );

      // Add
      act(() => {
        result.current.addGlobalTeamGroup('Group 1');
      });
      rerender({ groups });
      expect(groups).toHaveLength(1);
      const groupId = groups[0].id;

      // Update
      act(() => {
        result.current.updateGlobalTeamGroup(groupId, { name: 'New Name' });
      });
      rerender({ groups });
      expect(groups[0].name).toBe('New Name');

      // Reorder
      act(() => {
        result.current.addGlobalTeamGroup('Group 2');
      });
      rerender({ groups });
      
      act(() => {
        result.current.reorderGlobalTeamGroup(groups[1].id, 'up');
      });
      rerender({ groups });
      const sorted = [...groups].sort((a, b) => a.order - b.order);
      expect(sorted[0].name).toBe('Group 2');

      // Delete
      act(() => {
        result.current.deleteGlobalTeamGroup(groupId);
      });
      rerender({ groups });
      expect(groups).toHaveLength(1);
    });
  });

  describe('usage and assignment', () => {
    it('assigns and unassigns teams', () => {
      let nodes: FlowNode[] = [createGameNode('g1', { x: 0, y: 0 }, {})];
      const setNodes = vi.fn((update) => {
        nodes = typeof update === 'function' ? update(nodes) : update;
      });

      const { result } = renderHook(
        () => useTeamPoolState([], vi.fn(), [], vi.fn(), nodes, setNodes)
      );

      act(() => {
        result.current.assignTeamToGame('g1', 't1', 'home');
      });
      expect((nodes[0] as any).data.homeTeamId).toBe('t1');

      act(() => {
        result.current.unassignTeamFromGame('g1', 'home');
      });
      expect((nodes[0] as any).data.homeTeamId).toBeNull();
    });

    it('tracks team usage', () => {
      const nodes = [
        createGameNode('g1', { x: 0, y: 0 }, { homeTeamId: 't1' }),
        createGameNode('g2', { x: 0, y: 0 }, { awayTeamId: 't1' }),
      ];
      const { result } = renderHook(
        () => useTeamPoolState([], vi.fn(), [], vi.fn(), nodes, vi.fn())
      );

      const usage = result.current.getTeamUsage('t1');
      expect(usage).toHaveLength(2);
      expect(usage).toContainEqual({ gameId: 'g1', slot: 'home' });
      expect(usage).toContainEqual({ gameId: 'g2', slot: 'away' });
    });
  });
});