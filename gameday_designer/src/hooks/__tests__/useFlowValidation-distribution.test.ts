import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';

describe('useFlowValidation - Game Distribution', () => {
  const globalTeams: GlobalTeam[] = [
    { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
    { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
    { id: 't3', label: 'Team 3', groupId: 'g1', order: 2 },
  ];

  const globalTeamGroups: GlobalTeamGroup[] = [
    { id: 'g1', name: 'Group A', order: 0 },
  ];

  it('should warn when teams in a group have uneven game counts', () => {
    const nodes: FlowNode[] = [
      {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 1', order: 0, category: 'preliminary' },
        position: { x: 0, y: 0 },
      },
      // Team 1 vs Team 2
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' },
        position: { x: 0, y: 0 },
      },
      // Team 1 vs Team 3
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'G2', homeTeamId: 't1', awayTeamId: 't3' },
        position: { x: 0, y: 0 },
      },
      // Team 1 has 2 games, Team 2 has 1 game, Team 3 has 1 game.
      // This might be considered "uneven" if they are all in the same group and we expect round robin.
      // Actually, in a group of 3, everyone should have 2 games.
      // So Team 2 and 3 are missing one game.
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], globalTeams, globalTeamGroups));

    const warning = result.current.warnings.find(w => w.type === 'uneven_game_distribution');
    expect(warning).toBeDefined();
    expect(warning?.messageKey).toBe('uneven_game_distribution');
    expect(warning?.messageParams).toEqual({
      group: 'Group A',
      minGames: 1,
      maxGames: 2
    });
  });

  it('should not warn when all teams in a group have same game counts', () => {
    const nodes: FlowNode[] = [
      {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 1', order: 0, category: 'preliminary' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'G2', homeTeamId: 't2', awayTeamId: 't3' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game3',
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'G3', homeTeamId: 't3', awayTeamId: 't1' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], globalTeams, globalTeamGroups));

    const warning = result.current.warnings.find(w => w.type === 'uneven_game_distribution');
    expect(warning).toBeUndefined();
  });

  it('should ignore teams without a group in distribution check', () => {
    const ungroupedTeams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: null, order: 0 },
      { id: 't2', label: 'Team 2', groupId: null, order: 1 },
    ];

    const nodes: FlowNode[] = [
      {
        id: 'game1',
        type: 'game',
        data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], ungroupedTeams, []));

    const warning = result.current.warnings.find(w => w.type === 'uneven_game_distribution');
    expect(warning).toBeUndefined();
  });

  it('should ignore groups with fewer than 2 teams in distribution check', () => {
    const singleTeamGroup: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
    ];
    const groups: GlobalTeamGroup[] = [{ id: 'g1', name: 'Group 1', order: 0 }];

    const nodes: FlowNode[] = [
      {
        id: 'game1',
        type: 'game',
        data: { standing: 'G1', homeTeamId: 't1', awayTeamId: null },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], singleTeamGroup, groups));

    const warning = result.current.warnings.find(w => w.type === 'uneven_game_distribution');
    expect(warning).toBeUndefined();
  });

  it('should fallback to Unknown Group if group name is not found', () => {
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'T1', groupId: 'missing-group', order: 0 },
      { id: 't2', label: 'T2', groupId: 'missing-group', order: 1 },
    ];

    const nodes: FlowNode[] = [
      {
        id: 'game1',
        type: 'game',
        data: { standing: 'G1', homeTeamId: 't1', awayTeamId: null },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], teams, []));

    const warning = result.current.warnings.find(w => w.type === 'uneven_game_distribution');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('Unknown Group');
  });
});
