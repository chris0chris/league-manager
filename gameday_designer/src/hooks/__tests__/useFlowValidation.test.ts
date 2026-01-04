/**
 * Tests for useFlowValidation Hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import {
  createTeamNode,
  createGameNode,
  createTeamToGameEdge,
  createGameToGameEdge,
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createTeamNodeInStage,
  type FlowNode,
  type FlowEdge,
} from '../../types/flowchart';

describe('useFlowValidation', () => {
  describe('incomplete game inputs', () => {
    it('returns error when game has no connections', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, game];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(false);
      const incompleteError = result.current.errors.find(
        (e) => e.type === 'incomplete_game_inputs'
      );
      expect(incompleteError).toBeDefined();
      expect(incompleteError?.message).toContain('HF1');
      expect(incompleteError?.message).toContain('home and away');
    });

    it('returns error when game is missing away connection', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team1 = createTeamNodeInStage('team-1', 'stage-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, team1, game];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(false);
      const incompleteError = result.current.errors.find(
        (e) => e.type === 'incomplete_game_inputs'
      );
      expect(incompleteError?.message).toContain('away');
    });

    it('returns error when game is missing home connection', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team1 = createTeamNodeInStage('team-1', 'stage-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, team1, game];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(false);
      const incompleteError = result.current.errors.find(
        (e) => e.type === 'incomplete_game_inputs'
      );
      expect(incompleteError?.message).toContain('home');
    });

    it('returns no error when game has both connections', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team1 = createTeamNodeInStage('team-1', 'stage-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const team2 = createTeamNodeInStage('team-2', 'stage-1', { type: 'groupTeam', group: 0, team: 1 }, '0_1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, team1, team2, game];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const incompleteErrors = result.current.errors.filter(
        (e) => e.type === 'incomplete_game_inputs'
      );
      expect(incompleteErrors).toHaveLength(0);
    });
  });

  describe('circular dependencies', () => {
    it('returns error for direct circular dependency', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
        createGameNode('game-1', { x: 0, y: 0 }, { standing: 'HF1' }),
        createGameNode('game-2', { x: 0, y: 0 }, { standing: 'HF2' }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        createGameToGameEdge('e3', 'game-1', 'winner', 'game-2', 'home'),
        createGameToGameEdge('e4', 'game-2', 'winner', 'game-1', 'home'), // Creates cycle
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const circularErrors = result.current.errors.filter(
        (e) => e.type === 'circular_dependency'
      );
      expect(circularErrors.length).toBeGreaterThan(0);
    });

    it('returns no error for valid chain', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
        createTeamNode('team-3', { type: 'groupTeam', group: 0, team: 2 }, '0_2'),
        createTeamNode('team-4', { type: 'groupTeam', group: 0, team: 3 }, '0_3'),
        createGameNode('game-1', { x: 0, y: 0 }, { standing: 'HF1' }),
        createGameNode('game-2', { x: 0, y: 0 }, { standing: 'HF2' }),
        createGameNode('game-3', { x: 0, y: 0 }, { standing: 'Final' }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        createTeamToGameEdge('e3', 'team-3', 'game-2', 'home'),
        createTeamToGameEdge('e4', 'team-4', 'game-2', 'away'),
        createGameToGameEdge('e5', 'game-1', 'winner', 'game-3', 'home'),
        createGameToGameEdge('e6', 'game-2', 'winner', 'game-3', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const circularErrors = result.current.errors.filter(
        (e) => e.type === 'circular_dependency'
      );
      expect(circularErrors).toHaveLength(0);
    });
  });

  describe('official playing', () => {
    it('returns error when official is home team', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
        createGameNode('game-1', { x: 0, y: 0 }, {
          standing: 'HF1',
          official: { type: 'groupTeam', group: 0, team: 0 }, // Same as home
        }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const officialErrors = result.current.errors.filter(
        (e) => e.type === 'official_playing'
      );
      expect(officialErrors).toHaveLength(1);
      expect(officialErrors[0].message).toContain('0_0');
    });

    it('returns error when official is away team', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
        createGameNode('game-1', { x: 0, y: 0 }, {
          standing: 'HF1',
          official: { type: 'groupTeam', group: 0, team: 1 }, // Same as away
        }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const officialErrors = result.current.errors.filter(
        (e) => e.type === 'official_playing'
      );
      expect(officialErrors).toHaveLength(1);
    });

    it('returns no error when official is different team', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
        createGameNode('game-1', { x: 0, y: 0 }, {
          standing: 'HF1',
          official: { type: 'groupTeam', group: 0, team: 2 }, // Different team
        }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const officialErrors = result.current.errors.filter(
        (e) => e.type === 'official_playing'
      );
      expect(officialErrors).toHaveLength(0);
    });
  });

  describe('duplicate standings', () => {
    it('returns warning for duplicate standings', () => {
      const nodes: FlowNode[] = [
        createGameNode('game-1', { x: 0, y: 0 }, { standing: 'HF1' }),
        createGameNode('game-2', { x: 0, y: 0 }, { standing: 'HF1' }), // Duplicate
      ];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const duplicateWarnings = result.current.warnings.filter(
        (w) => w.type === 'duplicate_standing'
      );
      expect(duplicateWarnings).toHaveLength(1);
      expect(duplicateWarnings[0].message).toContain('HF1');
      expect(duplicateWarnings[0].affectedNodes).toHaveLength(2);
    });

    it('returns no warning for unique standings', () => {
      const nodes: FlowNode[] = [
        createGameNode('game-1', { x: 0, y: 0 }, { standing: 'HF1' }),
        createGameNode('game-2', { x: 0, y: 0 }, { standing: 'HF2' }),
      ];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const duplicateWarnings = result.current.warnings.filter(
        (w) => w.type === 'duplicate_standing'
      );
      expect(duplicateWarnings).toHaveLength(0);
    });
  });

  describe('orphaned teams', () => {
    it('returns warning for team with no outgoing connections', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
      ];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const orphanWarnings = result.current.warnings.filter(
        (w) => w.type === 'orphaned_team'
      );
      expect(orphanWarnings).toHaveLength(1);
      expect(orphanWarnings[0].message).toContain('0_0');
    });

    it('returns no warning for connected team', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
        createGameNode('game-1', { x: 0, y: 0 }, { standing: 'HF1' }),
      ];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const orphanWarnings = result.current.warnings.filter(
        (w) => w.type === 'orphaned_team'
      );
      expect(orphanWarnings).toHaveLength(0);
    });
  });

  describe('unassigned fields', () => {
    it('returns warning for game without field', () => {
      const nodes: FlowNode[] = [
        createGameNode('game-1', { x: 0, y: 0 }, {
          standing: 'HF1',
          fieldId: null,
        }),
      ];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const fieldWarnings = result.current.warnings.filter(
        (w) => w.type === 'unassigned_field'
      );
      expect(fieldWarnings).toHaveLength(1);
      expect(fieldWarnings[0].message).toContain('HF1');
    });

    it('returns no warning for game with field', () => {
      const nodes: FlowNode[] = [
        createGameNode('game-1', { x: 0, y: 0 }, {
          standing: 'HF1',
          fieldId: 'field-1',
        }),
      ];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const fieldWarnings = result.current.warnings.filter(
        (w) => w.type === 'unassigned_field'
      );
      expect(fieldWarnings).toHaveLength(0);
    });
  });

  describe('isValid flag', () => {
    it('returns true when no errors exist', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const team1 = createTeamNodeInStage('team-1', 'stage-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const team2 = createTeamNodeInStage('team-2', 'stage-1', { type: 'groupTeam', group: 0, team: 1 }, '0_1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, team1, team2, game];
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
      // May still have warnings
    });

    it('returns false when errors exist', () => {
      // Use proper container hierarchy but no connections -> incomplete_game_inputs error
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, game];
      const edges: FlowEdge[] = [];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(false);
    });
  });

  describe('memoization', () => {
    it('returns same result object when inputs unchanged', () => {
      // Use proper container hierarchy
      const field = createFieldNode('field-1');
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });

      const nodes: FlowNode[] = [field, stage, game];
      const edges: FlowEdge[] = [];

      const { result, rerender } = renderHook(() =>
        useFlowValidation(nodes, edges)
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});
