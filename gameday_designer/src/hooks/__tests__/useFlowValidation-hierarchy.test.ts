/**
 * Tests for useFlowValidation Hook - Strict Hierarchy Enforcement
 *
 * TDD RED Phase: Tests for strict container hierarchy validation:
 * - Teams outside containers are ERRORS (not warnings)
 * - Games outside containers are ERRORS (not warnings)
 * - Teams must have parent stage
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

describe('useFlowValidation - Strict Hierarchy Enforcement', () => {
  describe('Teams outside containers', () => {
    it('errors when team has no parent stage', () => {
      const orphanTeam = createTeamNode(
        'team-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [orphanTeam];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'team_outside_container',
          affectedNodes: ['team-1'],
        })
      );
      expect(result.current.isValid).toBe(false);
    });

    it('does not error when team is inside a stage', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team = createTeamNodeInStage(
        'team-1',
        'stage-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [field, stage, team];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const teamOutsideError = result.current.errors.find(
        (e) => e.type === 'team_outside_container'
      );
      expect(teamOutsideError).toBeUndefined();
    });

    it('errors when team parent is not a valid stage', () => {
      const field = createFieldNode('field-1');
      // Team with parent that doesn't exist
      const team = createTeamNodeInStage(
        'team-1',
        'non-existent-stage',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [field, team];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'team_outside_container',
          affectedNodes: ['team-1'],
        })
      );
    });
  });

  describe('Games outside containers - now an error', () => {
    it('errors when game has no parent stage (was warning)', () => {
      const orphanGame = createGameNode('game-1', { x: 100, y: 100 }, { standing: 'HF1' });

      const nodes: FlowNode[] = [orphanGame];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Should be an error, not a warning
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'game_outside_container',
          affectedNodes: ['game-1'],
        })
      );
      expect(result.current.isValid).toBe(false);

      // Should NOT be in warnings anymore
      const warningType = result.current.warnings.find(
        (w) => w.type === 'game_outside_container'
      );
      expect(warningType).toBeUndefined();
    });

    it('does not error when game is inside a stage', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
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

      const outsideContainerError = result.current.errors.find(
        (e) => e.type === 'game_outside_container'
      );
      expect(outsideContainerError).toBeUndefined();
    });
  });

  describe('Orphaned team - no longer separate warning', () => {
    it('team outside container takes precedence over orphaned warning', () => {
      // Orphan team (no connections AND no container)
      const orphanTeam = createTeamNode(
        'team-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [orphanTeam];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Should have team_outside_container error
      expect(result.current.errors).toContainEqual(
        expect.objectContaining({
          type: 'team_outside_container',
        })
      );

      // Should still have orphaned warning (separate concern)
      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          type: 'orphaned_team',
        })
      );
    });

    it('team inside container can still have orphaned warning', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team = createTeamNodeInStage(
        'team-1',
        'stage-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [field, stage, team];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      // Should NOT have container error
      const containerError = result.current.errors.find(
        (e) => e.type === 'team_outside_container'
      );
      expect(containerError).toBeUndefined();

      // Should still have orphaned warning
      expect(result.current.warnings).toContainEqual(
        expect.objectContaining({
          type: 'orphaned_team',
          affectedNodes: ['team-1'],
        })
      );
    });
  });

  describe('Complete valid hierarchy', () => {
    it('no hierarchy errors for properly structured design', () => {
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
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

      // Filter for hierarchy-related errors only
      const hierarchyErrors = result.current.errors.filter(
        (e) =>
          e.type === 'team_outside_container' ||
          e.type === 'game_outside_container' ||
          e.type === 'stage_outside_field'
      );

      expect(hierarchyErrors).toHaveLength(0);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Error type enumeration', () => {
    it('includes team_outside_container in error types', () => {
      const orphanTeam = createTeamNode(
        'team-1',
        { type: 'groupTeam', group: 0, team: 0 },
        '0_0'
      );

      const nodes: FlowNode[] = [orphanTeam];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const error = result.current.errors.find(
        (e) => e.type === 'team_outside_container'
      );
      expect(error).toBeDefined();
      expect(error?.message).toContain('stage');
    });

    it('game_outside_container is now an error type', () => {
      const orphanGame = createGameNode('game-1', { x: 100, y: 100 }, { standing: 'HF1' });

      const nodes: FlowNode[] = [orphanGame];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const error = result.current.errors.find(
        (e) => e.type === 'game_outside_container'
      );
      expect(error).toBeDefined();
      expect(error?.message).toContain('stage');
    });
  });
});
