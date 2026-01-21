import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode } from '../../types/flowchart';

describe('useFlowValidation i18n', () => {
  it('should return translation keys and params for validation errors', () => {
    // Create a scenario with incomplete inputs (no home/away teams)
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
            homeTeamId: null,
            awayTeamId: null,
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
    ];

    const { result } = renderHook(() => useFlowValidation(nodes, []));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);

    const error = result.current.errors[0];
    
    // Check for i18n properties
    expect(error.messageKey).toBe('incomplete_game_inputs');
    expect(error.messageParams).toEqual({
        game: 'Game 1',
        missing: 'home and away'
    });
  });
});
