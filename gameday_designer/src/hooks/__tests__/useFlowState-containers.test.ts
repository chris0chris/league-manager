/**
 * Tests for useFlowState Hook - Container Operations
 *
 * TDD RED Phase: Tests for Field and Stage container operations including:
 * - Adding field containers
 * - Adding stage containers inside fields
 * - Adding games inside stages
 * - Cascade delete for containers
 * - Getting derived field/stage for games
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import {
  isFieldNode,
  isStageNode,
  isGameNode,
} from '../../types/flowchart';

describe('useFlowState - Container Operations', () => {
  describe('addFieldNode', () => {
    it('creates a field container node', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addFieldNode();
      });

      expect(result.current.nodes).toHaveLength(1);
      const field = result.current.nodes[0];
      expect(isFieldNode(field)).toBe(true);
      expect(field.data.name).toBe('Feld 1');
    });

    it('creates field with custom name', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addFieldNode({ name: 'Main Field' });
      });

      const field = result.current.nodes[0];
      expect(field.data.name).toBe('Main Field');
    });

    it('creates field with stage by default', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addFieldNode(undefined, true);
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(isFieldNode(result.current.nodes[0])).toBe(true);
      expect(isStageNode(result.current.nodes[1])).toBe(true);
      expect(result.current.nodes[1].parentId).toBe(result.current.nodes[0].id);
    });

    it('increments field numbers automatically', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addFieldNode();
      });

      act(() => {
        result.current.addFieldNode();
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.nodes[0].data.name).toBe('Feld 1');
      expect(result.current.nodes[1].data.name).toBe('Feld 2');
    });
  });

  describe('addStageNode', () => {
    it('creates a stage inside a field', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        result.current.addStageNode(fieldId);
      });

      const stage = result.current.nodes.find(isStageNode);
      expect(stage).toBeDefined();
      expect(stage?.parentId).toBe(fieldId);
      expect(stage?.data.name).toBe('Preliminary');
    });

    it('creates stage with custom name and type', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        result.current.addStageNode(fieldId, { name: 'Final', category: 'final', stageType: 'STANDARD' });
      });

      const stage = result.current.nodes.find(isStageNode);
      expect(stage?.data.name).toBe('Final');
      expect(stage?.data.stageType).toBe('STANDARD');
    });

    it('creates second stage with Finalrunde as default', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        result.current.addStageNode(fieldId);
      });

      act(() => {
        result.current.addStageNode(fieldId);
      });

      const stages = result.current.nodes.filter(isStageNode);
      expect(stages).toHaveLength(2);
      expect(stages[0].data.name).toBe('Preliminary');
      expect(stages[1].data.name).toBe('Final');
    });

    it('returns null if field does not exist', () => {
      const { result } = renderHook(() => useFlowState());

      let stageResult: ReturnType<typeof result.current.addStageNode>;
      act(() => {
        stageResult = result.current.addStageNode('non-existent-field');
      });

      expect(stageResult!).toBeNull();
      expect(result.current.nodes).toHaveLength(0);
    });
  });

  describe('addGameNodeInStage', () => {
    it('creates a game inside a stage', () => {
      const { result } = renderHook(() => useFlowState());

      let stageId: string;
      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId);
      });

      const game = result.current.nodes.find(isGameNode);
      expect(game).toBeDefined();
      expect(game?.parentId).toBe(stageId);
    });

    it('creates game with custom standing', () => {
      const { result } = renderHook(() => useFlowState());

      let stageId: string;
      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId, { standing: 'HF1' });
      });

      const game = result.current.nodes.find(isGameNode);
      expect(game?.data.standing).toBe('HF1');
    });

    it('auto-creates field and stage if none exist', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addGameNodeInStage();
      });

      expect(result.current.nodes).toHaveLength(3);
      expect(isFieldNode(result.current.nodes[0])).toBe(true);
      expect(isStageNode(result.current.nodes[1])).toBe(true);
      expect(isGameNode(result.current.nodes[2])).toBe(true);

      const game = result.current.nodes[2];
      const stage = result.current.nodes[1];
      expect(game.parentId).toBe(stage.id);
    });
  });

  describe('deleteNode - Cascade Delete', () => {
    it('deletes field and all its stages and games', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId);
        result.current.addGameNodeInStage(stageId);
      });

      expect(result.current.nodes).toHaveLength(4); // field, stage, 2 games

      act(() => {
        result.current.deleteNode(fieldId);
      });

      expect(result.current.nodes).toHaveLength(0);
    });

    it('deletes stage and all its games', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId);
        result.current.addGameNodeInStage(stageId);
      });

      expect(result.current.nodes).toHaveLength(4); // field, stage, 2 games

      act(() => {
        result.current.deleteNode(stageId);
      });

      expect(result.current.nodes).toHaveLength(1); // only field remains
      expect(isFieldNode(result.current.nodes[0])).toBe(true);
    });

    it('deletes only the game node (no cascade)', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
      });

      expect(result.current.nodes).toHaveLength(3);

      act(() => {
        result.current.deleteNode(gameId);
      });

      expect(result.current.nodes).toHaveLength(2); // field and stage remain
    });

    it('removes edges connected to deleted nodes', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      let gameId2: string;

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
        gameId2 = result.current.addGameNodeInStage(stageId).id;
        // Add a game-to-game edge instead of team edge (teams are now in global pool)
        result.current.setEdges([
          {
            id: 'edge-1',
            type: 'gameToGame' as const,
            source: gameId,
            target: gameId2,
            sourceHandle: 'winner',
            targetHandle: 'home',
            data: {
              sourcePort: 'winner' as const,
              targetPort: 'home' as const
            },
          },
        ]);
      });

      expect(result.current.edges).toHaveLength(1);

      act(() => {
        result.current.deleteNode(fieldId);
      });

      // Edge should be removed because both source and target games were deleted
      expect(result.current.edges).toHaveLength(0);
    });
  });

  describe('getGameField', () => {
    it('returns the parent field of a game', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;
      act(() => {
        fieldId = result.current.addFieldNode({ name: 'Main Field' }).id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
      });

      const field = result.current.getGameField(gameId);
      expect(field).toBeDefined();
      expect(field?.id).toBe(fieldId);
      expect(field?.data.name).toBe('Main Field');
    });

    it('returns null for game without valid hierarchy', () => {
      const { result } = renderHook(() => useFlowState());

      // Create orphan game (should not happen in real use)
      act(() => {
        result.current.addGameNode();
      });

      const game = result.current.nodes[0];
      const field = result.current.getGameField(game.id);
      expect(field).toBeNull();
    });
  });

  describe('getGameStage', () => {
    it('returns the parent stage of a game', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId, { name: 'Final', category: 'final' })!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
      });

      const stage = result.current.getGameStage(gameId);
      expect(stage).toBeDefined();
      expect(stage?.id).toBe(stageId);
      expect(stage?.data.name).toBe('Final');
    });

    it('returns null for game without parent stage', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addGameNode();
      });

      const game = result.current.nodes[0];
      const stage = result.current.getGameStage(game.id);
      expect(stage).toBeNull();
    });
  });

  describe('getFieldStages', () => {
    it('returns all stages in a field', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        result.current.addStageNode(fieldId, { name: 'Preliminary' });
        result.current.addStageNode(fieldId, { name: 'Final' });
      });

      const stages = result.current.getFieldStages(fieldId);
      expect(stages).toHaveLength(2);
      expect(stages[0].data.name).toBe('Preliminary');
      expect(stages[1].data.name).toBe('Final');
    });

    it('returns empty array for field with no stages', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      const stages = result.current.getFieldStages(fieldId);
      expect(stages).toHaveLength(0);
    });
  });

  describe('getStageGames', () => {
    it('returns all games in a stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addGameNodeInStage(stageId, { standing: 'Game 1' });
        result.current.addGameNodeInStage(stageId, { standing: 'Game 2' });
      });

      const games = result.current.getStageGames(stageId);
      expect(games).toHaveLength(2);
    });

    it('returns empty array for stage with no games', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      const games = result.current.getStageGames(stageId);
      expect(games).toHaveLength(0);
    });
  });

  describe('Container selection', () => {
    it('selectedContainerField returns selected field', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
        result.current.selectNode(fieldId);
      });

      expect(result.current.selectedContainerField).toBeDefined();
      expect(result.current.selectedContainerField?.id).toBe(fieldId);
    });

    it('selectedContainerStage returns selected stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
        result.current.selectNode(stageId);
      });

      expect(result.current.selectedContainerStage).toBeDefined();
      expect(result.current.selectedContainerStage?.id).toBe(stageId);
    });
  });
});
