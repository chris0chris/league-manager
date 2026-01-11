import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode, GlobalTeam } from '../../types/flowchart';

describe('useFlowValidation - Team Capacity', () => {
  const teams: GlobalTeam[] = [
    { id: 't1', label: 'Team 1', groupId: null, order: 0 },
    { id: 't2', label: 'Team 2', groupId: null, order: 1 },
    { id: 't3', label: 'Team 3', groupId: null, order: 2 },
  ];

  it('should detect when a team plays in two overlapping games', () => {
    const nodes: FlowNode[] = [
      {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'field2',
        type: 'field',
        data: { name: 'Field 2', order: 1 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2',
        type: 'stage',
        parentId: 'field2',
        data: { name: 'Stage 2', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 1',
          startTime: '10:00',
          duration: 60,
          breakAfter: 0,
          homeTeamId: 't1',
          awayTeamId: 't2',
          official: null,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage2',
        data: {
          standing: 'Game 2',
          startTime: '10:30', // Overlaps with Game 1
          duration: 60,
          breakAfter: 0,
          homeTeamId: 't1', // Team 1 is playing here too!
          awayTeamId: 't3',
          official: null,
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], teams));

    expect(result.current.isValid).toBe(false);
    const capacityError = result.current.errors.find(e => e.type === 'team_overlap');
    expect(capacityError).toBeDefined();
    expect(capacityError?.messageParams).toEqual({
      team: 'Team 1',
      game1: 'Game 1',
      game2: 'Game 2',
    });
    expect(capacityError?.affectedNodes).toContain('game1');
    expect(capacityError?.affectedNodes).toContain('game2');
  });

  it('should detect when a team is officiating and playing simultaneously', () => {
    const nodes: FlowNode[] = [
      {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'field2',
        type: 'field',
        data: { name: 'Field 2', order: 1 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2',
        type: 'stage',
        parentId: 'field2',
        data: { name: 'Stage 2', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 1',
          startTime: '10:00',
          duration: 60,
          breakAfter: 0,
          homeTeamId: 't1',
          awayTeamId: 't2',
          official: null,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage2',
        data: {
          standing: 'Game 2',
          startTime: '10:30', // Overlaps
          duration: 60,
          breakAfter: 0,
          homeTeamId: 't3',
          awayTeamId: 't2',
          official: 't1', // Team 1 is officiating here while playing in Game 1
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], teams));

    expect(result.current.isValid).toBe(false);
    const capacityError = result.current.errors.find(e => e.type === 'team_overlap');
    expect(capacityError).toBeDefined();
    expect(capacityError?.messageParams).toEqual({
      team: 'Team 1',
      game1: 'Game 1',
      game2: 'Game 2',
    });
  });

  it('should handle invalid time formats gracefully in capacity check', () => {
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
        data: { name: 'Stage 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'G1',
          startTime: 'invalid',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], [], [{ id: 'team1', label: 'Team 1', groupId: null, order: 0 }]));
    expect(result.current.isValid).toBe(true);
  });
});
