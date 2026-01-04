/**
 * Tests for useFlowValidation Hook - Container Validation Rules
 *
 * TDD RED Phase: Tests for container-related validation rules including:
 * - Games must have parent stage
 * - Stages must have parent field
 * - Warning about games outside containers
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import {
  createFieldNode,
  createStageNode,
  createGameNode,
  createGameNodeInStage,
  createTeamNode,
  createTeamNodeInStage,
  type FlowNode,
  type FlowEdge,
} from '../../types/flowchart';

describe('useFlowValidation - Container Rules', () => {
  describe('Games outside containers', () => {
    it('errors when game has no parent stage (strict hierarchy)', () => {
      const orphanGame = createGameNode('game-1', { x: 100, y: 100 }, { standing: 'HF1' });

      const nodes: FlowNode[] = [orphanGame];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Now an error, not a warning (strict hierarchy enforcement)
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'game_outside_container',
          affectedNodes: ['game-1'],
        })
      );
      expect(result.current.isValid).toBe(false);
    });

    it('does not error when game is inside a stage', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const nodes: FlowNode[] = [field, stage, game, homeTeam, awayTeam];
      const edges: FlowEdge[] = [
        {
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        },
        {
          id: 'edge-2',
          type: 'teamToGame',
          source: 'team-2',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'away',
          data: { targetPort: 'away' },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const outsideContainerError = result.current.errors.find(
        (e) => e.type === 'game_outside_container'
      );
      expect(outsideContainerError).toBeUndefined();
    });
  });

  describe('Stages outside fields', () => {
    it('errors when stage has no parent field', () => {
      // Stage with invalid parent
      const orphanStage = createStageNode('stage-1', 'non-existent-field');

      const nodes: FlowNode[] = [orphanStage];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'stage_outside_field',
          affectedNodes: ['stage-1'],
        })
      );
      expect(result.current.isValid).toBe(false);
    });

    it('does not error when stage has valid parent field', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');

      const nodes: FlowNode[] = [field, stage];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const outsideFieldError = result.current.errors.find(
        (e) => e.type === 'stage_outside_field'
      );
      expect(outsideFieldError).toBeUndefined();
    });
  });

  describe('Derived field from hierarchy', () => {
    it('uses stage parent for field derivation when checking field assignment', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const stage = createStageNode('stage-1', 'field-1');
      // Game in stage, but has no explicit fieldId - field derived from hierarchy
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const nodes: FlowNode[] = [field, stage, game, homeTeam, awayTeam];
      const edges: FlowEdge[] = [
        {
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        },
        {
          id: 'edge-2',
          type: 'teamToGame',
          source: 'team-2',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'away',
          data: { targetPort: 'away' },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Should NOT have unassigned_field warning because field is derived from hierarchy
      const unassignedFieldWarning = result.current.warnings.find(
        (w) => w.type === 'unassigned_field'
      );
      expect(unassignedFieldWarning).toBeUndefined();
    });
  });

  describe('Container count checks', () => {
    it('errors when no fields exist but games exist (strict hierarchy)', () => {
      const game = createGameNode('game-1', { x: 100, y: 100 }, { standing: 'HF1' });

      const nodes: FlowNode[] = [game];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Should have error about missing container structure (game_outside_container is now an error)
      const hasContainerError = result.current.errors.some(
        (e) => e.type === 'game_outside_container'
      );
      expect(hasContainerError).toBe(true);
      expect(result.current.isValid).toBe(false);
    });

    it('no errors for properly structured hierarchy', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
      // Teams must also be in containers for strict hierarchy
      const homeTeam = createTeamNodeInStage(
        'team-1',
        'stage-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );
      const awayTeam = createTeamNodeInStage(
        'team-2',
        'stage-1',
        { type: 'groupTeam', group: 0, team: 1 },
        '0_1'
      );

      const nodes: FlowNode[] = [field, stage, game, homeTeam, awayTeam];
      const edges: FlowEdge[] = [
        {
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        },
        {
          id: 'edge-2',
          type: 'teamToGame',
          source: 'team-2',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'away',
          data: { targetPort: 'away' },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Check for container-related errors only (game_outside_container is now an error)
      const containerErrors = result.current.errors.filter(
        (e) =>
          e.type === 'stage_outside_field' ||
          e.type === 'game_outside_container' ||
          e.type === 'team_outside_container'
      );

      expect(containerErrors).toHaveLength(0);
    });
  });
});
