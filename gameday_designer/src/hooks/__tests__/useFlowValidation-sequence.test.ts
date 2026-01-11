import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode } from '../../types/flowchart';

describe('useFlowValidation - Stage Sequence', () => {
  it('should warn when stages on the same field have out-of-order start times', () => {
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
        data: { name: 'Stage 1', order: 0, startTime: '10:00', stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 2', order: 1, startTime: '09:00', stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, []));

    const warning = result.current.warnings.find(w => w.type === 'stage_time_conflict' && w.id.includes('stage_sequence_time'));
    expect(warning).toBeDefined();
    expect(warning?.messageKey).toBe('stage_sequence_time');
    expect(warning?.messageParams).toEqual({
      stage1: 'Stage 1',
      time1: '10:00',
      stage2: 'Stage 2',
      time2: '09:00'
    });
  });

  it('should warn when stage types follow an illogical order', () => {
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
        data: { name: 'Playoffs', order: 0, stageType: 'finalrunde' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2',
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Pool Play', order: 1, stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, []));

    const warning = result.current.warnings.find(w => w.id.includes('stage_sequence_type'));
    expect(warning).toBeDefined();
    expect(warning?.messageKey).toBe('stage_sequence_type');
    expect(warning?.messageParams).toEqual({
      stage1: 'Playoffs',
      type1: 'finalrunde',
      stage2: 'Pool Play',
      type2: 'vorrunde'
    });
  });

  it('should error when a stage has no parent field', () => {
    const nodes: FlowNode[] = [
      {
        id: 'stage1',
        type: 'stage',
        parentId: undefined, // Missing parent
        data: { name: 'Stage 1', order: 0, stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, []));

    const error = result.current.errors.find(e => e.type === 'stage_outside_field' && e.id === 'stage1_outside_field');
    expect(error).toBeDefined();
    expect(error?.messageKey).toBe('stage_outside_field');
  });

  it('should error when a stage parent is not a field node', () => {
    const nodes: FlowNode[] = [
      {
        id: 'game1',
        type: 'game',
        data: { standing: 'G1' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1',
        type: 'stage',
        parentId: 'game1', // Invalid parent type
        data: { name: 'Stage 1', order: 0, stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, []));

    const error = result.current.errors.find(e => e.type === 'stage_outside_field' && e.id === 'stage1_outside_field');
    expect(error).toBeDefined();
    expect(error?.messageKey).toBe('stage_invalid_parent');
  });
});
