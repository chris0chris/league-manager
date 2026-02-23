import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode, FlowField } from '../../types/flowchart';

describe('useFlowValidation - Time Overlaps', () => {
  const fields: FlowField[] = [
    { id: 'field1', name: 'Field 1', order: 0 },
  ];

  it('should detect overlaps on the same field', () => {
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
        data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 1',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          fieldId: null,
          official: null,
          startTime: '10:00',
          duration: 60,
          breakAfter: 0,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 2',
          homeTeamId: 'team3',
          awayTeamId: 'team4',
          fieldId: null,
          official: null,
          startTime: '10:30', // Overlaps with Game 1 (10:00 - 11:00)
          duration: 60,
          breakAfter: 0,
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], fields));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].type).toBe('field_overlap');
    expect(result.current.errors[0].messageKey).toBe('field_overlap');
    expect(result.current.errors[0].messageParams).toEqual({
      game1: 'Game 1',
      game2: 'Game 2',
      field: 'Field 1',
    });
    expect(result.current.errors[0].affectedNodes).toContain('game1');
    expect(result.current.errors[0].affectedNodes).toContain('game2');
  });

  it('should not flag non-overlapping games', () => {
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
        data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 1',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          fieldId: null,
          official: null,
          startTime: '10:00',
          duration: 60,
          breakAfter: 0,
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2',
        type: 'game',
        parentId: 'stage1',
        data: {
          standing: 'Game 2',
          homeTeamId: 'team3',
          awayTeamId: 'team4',
          fieldId: null,
          official: null,
          startTime: '11:00', // Starts exactly when Game 1 ends
          duration: 60,
          breakAfter: 0,
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], fields));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle games in different stages on the same field', () => {
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
        data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 2', order: 1, progressionMode: 'manual' },
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
          homeTeamId: 't1', awayTeamId: 't2', official: null,
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
          homeTeamId: 't3', awayTeamId: 't4', official: null,
        },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, [], fields));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].type).toBe('field_overlap');
  });
});
