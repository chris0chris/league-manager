/**
 * Tests for useNodesState - Manual Time Overrides
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodesState } from '../useNodesState';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
} from '../../types/flowchart';
import type { FlowNode, GameNode } from '../../types/flowchart';

describe('useNodesState - Manual Time Overrides', () => {
  const setupHook = (initialNodes: FlowNode[] = []) => {
    let nodes = initialNodes;
    const setNodes = vi.fn((update) => {
      if (typeof update === 'function') {
        nodes = update(nodes);
      } else {
        nodes = update;
      }
    });

    const { result, rerender } = renderHook(
      ({ nodes }) => useNodesState(nodes, setNodes),
      { initialProps: { nodes } }
    );

    return { result, setNodes, getNodes: () => nodes, rerender };
  };

  it('should correctly set manualTime when updating game startTime', () => {
    const fieldId = 'field-1';
    const stageId = 'stage-1';
    const gameId = 'game-1';

    const field = createFieldNode(fieldId, { name: 'Field 1', order: 0 });
    const stage = createStageNode(stageId, fieldId, {
      name: 'Stage 1',
      category: 'preliminary',
      order: 0,
      startTime: '10:00',
      defaultGameDuration: 60,
    });
    const game = createGameNodeInStage(gameId, stageId, {
      standing: '1',
      duration: 60,
      startTime: '10:00',
      manualTime: false,
    });

    const { result, getNodes, rerender } = setupHook([field, stage, game]);

    // Update with manual time
    act(() => {
      result.current.updateNode(gameId, { startTime: '10:30', manualTime: true });
    });

    rerender({ nodes: getNodes() });

    const updatedNodes = getNodes();
    const updatedGame = updatedNodes.find(n => n.id === gameId) as GameNode;
    expect(updatedGame.data.startTime).toBe('10:30');
    expect(updatedGame.data.manualTime).toBe(true);
  });

  it('should preserve manual time when stage start time changes', () => {
    const fieldId = 'field-1';
    const stageId = 'stage-1';
    const game1Id = 'game-1';
    const game2Id = 'game-2';

    const field = createFieldNode(fieldId, { name: 'Field 1', order: 0 });
    const stage = createStageNode(stageId, fieldId, {
      name: 'Stage 1',
      category: 'preliminary',
      order: 0,
      startTime: '10:00',
      defaultGameDuration: 60,
    });
    // Game 1: Auto-calculated (will follow stage)
    const game1 = createGameNodeInStage(game1Id, stageId, {
      standing: '1',
      duration: 60,
      startTime: '10:00',
      manualTime: false,
    });
    // Game 2: Manual override
    const game2 = createGameNodeInStage(game2Id, stageId, {
      standing: '2',
      duration: 60,
      startTime: '11:30',
      manualTime: true,
    });

    const { result, getNodes, rerender } = setupHook([field, stage, game1, game2]);

    // Change stage start time to 11:00
    act(() => {
      result.current.updateNode(stageId, { startTime: '11:00' });
    });

    rerender({ nodes: getNodes() });

    const updatedNodes = getNodes();
    const updatedGame1 = updatedNodes.find(n => n.id === game1Id) as GameNode;
    const updatedGame2 = updatedNodes.find(n => n.id === game2Id) as GameNode;

    // Game 1 should follow stage: 11:00
    expect(updatedGame1.data.startTime).toBe('11:00');
    
    // Game 2 should STAY at 11:30 (manual override)
    expect(updatedGame2.data.startTime).toBe('11:30');
    expect(updatedGame2.data.manualTime).toBe(true);
  });

  it('should recalculate subsequent games when a game start time is manually updated', () => {
    const fieldId = 'field-1';
    const stageId = 'stage-1';
    const game1Id = 'game-1';
    const game2Id = 'game-2';

    const field = createFieldNode(fieldId, { name: 'Field 1', order: 0 });
    const stage = createStageNode(stageId, fieldId, {
      name: 'Stage 1',
      category: 'preliminary',
      order: 0,
      startTime: '10:00',
      defaultGameDuration: 60,
    });
    // Game 1: 10:00 - 11:00
    const game1 = createGameNodeInStage(game1Id, stageId, {
      standing: '1',
      duration: 60,
      startTime: '10:00',
      manualTime: false,
    });
    // Game 2: 11:00 - 12:00
    const game2 = createGameNodeInStage(game2Id, stageId, {
      standing: '2',
      duration: 60,
      startTime: '11:00',
      manualTime: false,
    });

    const { result, getNodes, rerender } = setupHook([field, stage, game1, game2]);

    // Manually set game 1 to 10:30
    act(() => {
      result.current.updateNode(game1Id, { startTime: '10:30', manualTime: true });
    });

    rerender({ nodes: getNodes() });

    const updatedNodes = getNodes();
    const updatedGame1 = updatedNodes.find(n => n.id === game1Id) as GameNode;
    const updatedGame2 = updatedNodes.find(n => n.id === game2Id) as GameNode;

    expect(updatedGame1.data.startTime).toBe('10:30');
    expect(updatedGame1.data.manualTime).toBe(true);
    
    // Game 2 should be recalculated to 11:30 (10:30 + 60)
    expect(updatedGame2.data.startTime).toBe('11:30');
  });
});
