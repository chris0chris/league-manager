/**
 * Tests for useFlowState Hook - Time Calculation and Updates
 *
 * TDD RED/GREEN/REFACTOR Phase: Tests for automatic time recalculation
 * when game break or duration changes
 *
 * Coverage targets:
 * - Lines 405-438: Game break/duration change triggers time recalculation
 * - Lines 686-701: addBulkGames time recalculation logic
 * - Time update cascading through stages
 * - Manual time override preservation
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import { isGameNode, isStageNode, isFieldNode } from '../../types/flowchart';

describe('useFlowState - Time Calculation and Updates', () => {
  describe('updateNode - Game Duration Changes', () => {
    it('should recalculate subsequent game times when duration changes', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;
      let game3Id: string;

      // Create field and stage with start time
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId, { name: 'Stage 1' });
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      // Set stage start time
      act(() => {
        result.current.updateNode(stageId, { startTime: '10:00' });
      });

      // Add three games with default duration (70 minutes) and breaks
      // Set their times manually first
      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, {
          standing: '1',
          duration: 70,
          breakAfter: 10,
          startTime: '10:00',
        }).id;
        game2Id = result.current.addGameNodeInStage(stageId, {
          standing: '2',
          duration: 70,
          breakAfter: 10,
          startTime: '11:20',
        }).id;
        game3Id = result.current.addGameNodeInStage(stageId, {
          standing: '3',
          duration: 70,
          breakAfter: 0,
          startTime: '12:40',
        }).id;
      });

      // Verify initial times
      const game1Before = result.current.nodes.find(
        (n) => n.id === game1Id && isGameNode(n)
      );
      const game2Before = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );
      const game3Before = result.current.nodes.find(
        (n) => n.id === game3Id && isGameNode(n)
      );

      expect(game1Before?.data.startTime).toBe('10:00');
      expect(game2Before?.data.startTime).toBe('11:20');
      expect(game3Before?.data.startTime).toBe('12:40');

      // Change game 1 duration to 30 minutes
      act(() => {
        result.current.updateNode(game1Id, { duration: 30 });
      });

      // Verify game 2 and 3 times are recalculated
      const game1After = result.current.nodes.find(
        (n) => n.id === game1Id && isGameNode(n)
      );
      const game2After = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );
      const game3After = result.current.nodes.find(
        (n) => n.id === game3Id && isGameNode(n)
      );

      expect(game1After?.data.startTime).toBe('10:00'); // unchanged
      expect(game1After?.data.duration).toBe(30);
      expect(game2After?.data.startTime).toBe('10:40'); // 10:00 + 30 + 10
      expect(game3After?.data.startTime).toBe('12:00'); // 10:40 + 70 + 10
    });

    it('should recalculate subsequent game times when break changes', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      // Create field and stage with start time
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        result.current.updateNode(stageId, { startTime: '14:00' });
      });

      // Add games with initial times
      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, {
          standing: '1',
          duration: 70,
          breakAfter: 10,
          startTime: '14:00',
        }).id;
        game2Id = result.current.addGameNodeInStage(stageId, {
          standing: '2',
          duration: 70,
          breakAfter: 0,
          startTime: '15:20',
        }).id;
      });

      // Change game 1 break from 10 to 20
      act(() => {
        result.current.updateNode(game1Id, { breakAfter: 20 });
      });

      // Verify game 2 time is recalculated
      const game2After = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );

      expect(game2After?.data.startTime).toBe('15:30'); // 14:00 + 70 + 20
    });

    it('should preserve manual time overrides during recalculation', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      // Create field and stage
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        result.current.updateNode(stageId, { startTime: '10:00' });
      });

      // Add games with initial times
      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, {
          standing: '1',
          duration: 70,
          breakAfter: 10,
          startTime: '10:00',
        }).id;
        game2Id = result.current.addGameNodeInStage(stageId, {
          standing: '2',
          duration: 70,
          breakAfter: 10,
          startTime: '11:20',
        }).id;
      });

      // Set manual time for game 2
      act(() => {
        result.current.updateNode(game2Id, {
          startTime: '11:30',
          manualTime: true,
        });
      });

      // Verify game 2 has manual time
      const game2Manual = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );
      expect(game2Manual?.data.manualTime).toBe(true);
      expect(game2Manual?.data.startTime).toBe('11:30');

      // Change game 1 duration - should NOT affect game 2 (manual override)
      act(() => {
        result.current.updateNode(game1Id, { duration: 30 });
      });

      const game2After = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );

      // Game 2 should keep manual time
      expect(game2After?.data.startTime).toBe('11:30'); // unchanged
      expect(game2After?.data.manualTime).toBe(true);
    });

    it('should not recalculate times if stage has no start time', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      // Create field and stage WITHOUT start time
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      // Verify stage has no start time
      const stageBefore = result.current.nodes.find(
        (n) => n.id === stageId && isStageNode(n)
      );
      expect(stageBefore?.data.startTime).toBeUndefined();

      // Add games
      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId, {
          standing: '1',
          duration: 50,
          breakAfter: 10,
        }).id;
        game2Id = result.current.addGameNodeInStage(stageId, {
          standing: '2',
          duration: 50,
          breakAfter: 0,
        }).id;
      });

      // Games should have no calculated times
      const game1Before = result.current.nodes.find(
        (n) => n.id === game1Id && isGameNode(n)
      );
      const game2Before = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );

      expect(game1Before?.data.startTime).toBeUndefined();
      expect(game2Before?.data.startTime).toBeUndefined();

      // Change game 1 duration
      act(() => {
        result.current.updateNode(game1Id, { duration: 30 });
      });

      // Times should still be undefined (no recalculation without stage start time)
      const game2After = result.current.nodes.find(
        (n) => n.id === game2Id && isGameNode(n)
      );
      expect(game2After?.data.startTime).toBeUndefined();
    });
  });

  describe('Stage Start Time Setting', () => {
    it('should allow setting stage start time', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      // Create field and stage
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      // Set stage start time
      act(() => {
        result.current.updateNode(stageId, { startTime: '10:00' });
      });

      // Verify stage has start time
      const stage = result.current.nodes.find(
        (n) => n.id === stageId && isStageNode(n)
      );
      expect(stage?.data.startTime).toBe('10:00');
    });

    it('should preserve games without startTime when stage has no startTime', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;

      // Create field and stage WITHOUT start time
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      // Add game
      act(() => {
        gameId = result.current.addGameNodeInStage(stageId, {
          standing: '1',
          duration: 50,
          breakAfter: 10,
        }).id;
      });

      // Game should have no start time
      const game = result.current.nodes.find(
        (n) => n.id === gameId && isGameNode(n)
      );
      expect(game?.data.startTime).toBeUndefined();
    });
  });

  describe('deleteNode - Cascade Delete Coverage', () => {
    it('should delete all games when deleting a stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let game1Id: string;
      let game2Id: string;

      // Create field, stage, and games
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage = result.current.addStageNode(fieldId);
        expect(stage).not.toBeNull();
        stageId = stage!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stageId).id;
        game2Id = result.current.addGameNodeInStage(stageId).id;
      });

      // Verify games exist
      expect(result.current.nodes.find((n) => n.id === game1Id)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === game2Id)).toBeDefined();

      // Delete the stage
      act(() => {
        result.current.deleteNode(stageId);
      });

      // Stage and all games should be deleted
      expect(result.current.nodes.find((n) => n.id === stageId)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === game1Id)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === game2Id)).toBeUndefined();
    });

    it('should delete all stages and games when deleting a field', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stage1Id: string;
      let stage2Id: string;
      let game1Id: string;
      let game2Id: string;

      // Create field with multiple stages and games
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        const stage1 = result.current.addStageNode(fieldId);
        expect(stage1).not.toBeNull();
        stage1Id = stage1!.id;
      });

      act(() => {
        const stage2 = result.current.addStageNode(fieldId);
        expect(stage2).not.toBeNull();
        stage2Id = stage2!.id;
      });

      act(() => {
        game1Id = result.current.addGameNodeInStage(stage1Id).id;
        game2Id = result.current.addGameNodeInStage(stage2Id).id;
      });

      // Verify everything exists
      expect(result.current.nodes.find((n) => n.id === fieldId)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === stage1Id)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === stage2Id)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === game1Id)).toBeDefined();
      expect(result.current.nodes.find((n) => n.id === game2Id)).toBeDefined();

      // Delete the field
      act(() => {
        result.current.deleteNode(fieldId);
      });

      // Everything should be deleted
      expect(result.current.nodes.find((n) => n.id === fieldId)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === stage1Id)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === stage2Id)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === game1Id)).toBeUndefined();
      expect(result.current.nodes.find((n) => n.id === game2Id)).toBeUndefined();
    });
  });

  describe('addFieldNode with includeStage parameter', () => {
    it('should create field with stage when includeStage is true', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;

      act(() => {
        const field = result.current.addFieldNode({ name: 'Test Field' }, true);
        fieldId = field.id;
      });

      // Verify field was created
      const field = result.current.nodes.find(
        (n) => n.id === fieldId && isFieldNode(n)
      );
      expect(field).toBeDefined();
      expect(field?.data.name).toBe('Test Field');

      // Verify stage was created in the field
      const stage = result.current.nodes.find(
        (n) => isStageNode(n) && n.parentId === fieldId
      );
      expect(stage).toBeDefined();
      expect(stage?.data.name).toBe('Vorrunde'); // First stage defaults to 'Vorrunde'
    });

    it('should create field without stage when includeStage is false', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;

      act(() => {
        const field = result.current.addFieldNode({ name: 'Test Field' }, false);
        fieldId = field.id;
      });

      // Verify field was created
      const field = result.current.nodes.find(
        (n) => n.id === fieldId && isFieldNode(n)
      );
      expect(field).toBeDefined();

      // Verify no stage was created
      const stage = result.current.nodes.find(
        (n) => isStageNode(n) && n.parentId === fieldId
      );
      expect(stage).toBeUndefined();
    });
  });
});
