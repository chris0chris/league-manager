import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode, FlowEdge, GameToGameEdge } from '../../types/flowchart';

describe('useFlowValidation - Progression Integrity', () => {
  it('should error when a progression edge goes from a later stage to an earlier stage', () => {
    const nodes: FlowNode[] = [
      {
        id: 'field1',
        type: 'field',
        data: { name: 'Field 1', order: 0 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage1', // Vorrunde
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 1', order: 0, stageType: 'vorrunde' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'stage2', // Finalrunde
        type: 'stage',
        parentId: 'field1',
        data: { name: 'Stage 2', order: 1, stageType: 'finalrunde' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game1', // In Finalrunde
        type: 'game',
        parentId: 'stage2',
        data: { standing: 'Final', homeTeamId: 't1', awayTeamId: 't2' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'game2', // In Vorrunde
        type: 'game',
        parentId: 'stage1',
        data: { standing: 'Prelim', homeTeamId: null, awayTeamId: 't3' },
        position: { x: 0, y: 0 },
      },
    ];

    const edges: FlowEdge[] = [
      {
        id: 'edge1',
        type: 'gameToGame',
        source: 'game1', // Finalrunde
        target: 'game2', // Vorrunde (Invalid!)
        sourceHandle: 'winner',
        targetHandle: 'home',
        data: { sourcePort: 'winner', targetPort: 'home' },
      } as GameToGameEdge,
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, edges));

    const error = result.current.errors.find(e => e.type === 'progression_order');
    expect(error).toBeDefined();
    expect(error?.messageKey).toBe('progression_order');
    expect(error?.messageParams).toEqual({
      sourceGame: 'Final',
      sourceStage: 'Stage 2',
      targetGame: 'Prelim',
      targetStage: 'Stage 1'
    });
  });
});
