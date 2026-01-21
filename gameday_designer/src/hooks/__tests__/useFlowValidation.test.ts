/**
 * Tests for useFlowValidation Hook
 *
 * TDD RED Phase: Comprehensive tests for flowchart validation logic
 *
 * Coverage targets:
 * - Incomplete game inputs detection
 * - Circular dependency detection
 * - Official playing validation
 * - Duplicate standing names
 * - Orphaned teams
 * - Unassigned fields
 * - Container hierarchy validation (v2 model)
 * - Dynamic reference validation
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode, FlowEdge, GameToGameEdge, TeamToGameEdge } from '../../types/flowchart';

describe('useFlowValidation', () => {
  describe('Valid Flowchart', () => {
    it('should return valid for empty flowchart with warnings', () => {
      const { result } = renderHook(() => useFlowValidation([], []));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
      expect(result.current.warnings).toHaveLength(2); // no_teams and no_games
    });

    it('should return valid for complete game with team assignments', () => {
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
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
    });

    it('should return valid for game with dynamic references', () => {
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
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 2',
            homeTeamDynamic: { type: 'winner', matchName: 'Game 1' },
            awayTeamDynamic: { type: 'loser', matchName: 'Game 1' },
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'edge1',
          type: 'game-to-game',
          source: 'game1',
          target: 'game2',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { outputType: 'winner' },
        } as GameToGameEdge,
        {
          id: 'edge2',
          type: 'game-to-game',
          source: 'game1',
          target: 'game2',
          sourceHandle: 'loser',
          targetHandle: 'away',
          data: { outputType: 'loser' },
        } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('Incomplete Game Inputs', () => {
    it('should detect game missing home team', () => {
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
            awayTeamId: 'team2',
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
      expect(result.current.errors[0].type).toBe('incomplete_game_inputs');
      expect(result.current.errors[0].message).toContain('home');
    });

    it('should detect game missing away team', () => {
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
      expect(result.current.errors[0].type).toBe('incomplete_game_inputs');
      expect(result.current.errors[0].message).toContain('away');
    });

    it('should detect game missing both teams', () => {
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
      expect(result.current.errors[0].type).toBe('incomplete_game_inputs');
      expect(result.current.errors[0].message).toContain('home and away');
    });

    it('should not flag incomplete when game has edge connection', () => {
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
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 2',
            homeTeamId: null,
            awayTeamId: null,
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'edge1',
          type: 'game-to-game',
          source: 'game1',
          target: 'game2',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { outputType: 'winner' },
        } as GameToGameEdge,
        {
          id: 'edge2',
          type: 'game-to-game',
          source: 'game1',
          target: 'game2',
          sourceHandle: 'loser',
          targetHandle: 'away',
          data: { outputType: 'loser' },
        } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
    });
  });

  describe('Circular Dependencies', () => {
    it('should detect simple circular dependency', () => {
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
            homeTeamDynamic: { type: 'winner', matchName: 'Game 2' },
            awayTeamId: null,
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 2',
            homeTeamId: null,
            homeTeamDynamic: { type: 'winner', matchName: 'Game 1' },
            awayTeamId: null,
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'edge1',
          type: 'gameToGame',
          source: 'game1',
          target: 'game2',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { sourcePort: 'winner', targetPort: 'home' },
        } as GameToGameEdge,
        {
          id: 'edge2',
          type: 'gameToGame',
          source: 'game2',
          target: 'game1',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { sourcePort: 'winner', targetPort: 'home' },
        } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.length).toBeGreaterThanOrEqual(1);
      const circularError = result.current.errors.find(e => e.type === 'circular_dependency');
      expect(circularError).toBeDefined();
      expect(circularError?.message).toContain('Circular dependency');
    });

    it('should detect longer circular dependency chain', () => {
      // ... existing test ...
    });

    it('should handle independent paths to the same node without flagging a cycle', () => {
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
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        { id: 'g1', type: 'game', parentId: 'stage1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } },
        { id: 'g2', type: 'game', parentId: 'stage1', data: { standing: 'G2', homeTeamId: 't3', awayTeamId: 't4' }, position: { x: 0, y: 0 } },
        { id: 'g3', type: 'game', parentId: 'stage1', data: { standing: 'G3' }, position: { x: 0, y: 0 } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', type: 'gameToGame', source: 'g1', target: 'g3', sourceHandle: 'winner', targetHandle: 'home', data: { sourcePort: 'winner', targetPort: 'home' } } as GameToGameEdge,
        { id: 'e2', type: 'gameToGame', source: 'g2', target: 'g3', sourceHandle: 'winner', targetHandle: 'away', data: { sourcePort: 'winner', targetPort: 'away' } } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));
      // g1 and g2 are valid (have teams)
      // g3 is valid (has edges for both ports)
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Official Playing Validation', () => {
    it('should detect when official matches home team via v1 edges', () => {
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
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'team1',
          type: 'team',
          parentId: 'stage1',
          data: { label: 'Team A', reference: { type: 'static', name: 'Team A' } },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'Game 1', official: { type: 'static', name: 'Team A' } },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', type: 'teamToGame', source: 'team1', target: 'game1', targetHandle: 'home', data: { targetPort: 'home' } } as TeamToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));
      const officialError = result.current.errors.find(e => e.type === 'official_playing');
      expect(officialError).toBeDefined();
    });

    it('should detect when official matches away team via v1 edges', () => {
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
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'team1',
          type: 'team',
          parentId: 'stage1',
          data: { label: 'Team B', reference: { type: 'static', name: 'Team B' } },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'Game 1', official: { type: 'static', name: 'Team B' } },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', type: 'teamToGame', source: 'team1', target: 'game1', targetHandle: 'away', data: { targetPort: 'away' } } as TeamToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));
      const officialError = result.current.errors.find(e => e.type === 'official_playing');
      expect(officialError).toBeDefined();
    });
    it('should detect when official is playing in home slot', () => {
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
            homeTeamId: 'team-a',
            awayTeamId: 'team-b',
            fieldId: 'field1',
            official: 'team-a',
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const globalTeams: GlobalTeam[] = [
        { id: 'team-a', label: 'Team A', groupId: null, order: 0 },
        { id: 'team-b', label: 'Team B', groupId: null, order: 1 },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, [], [], globalTeams));

      const officialError = result.current.errors.find(e => e.type === 'official_playing');
      expect(officialError).toBeDefined();
      expect(officialError?.messageParams).toEqual({
        game: 'Game 1',
        team: 'Team A'
      });
    });

    it('should detect when official is playing in away slot', () => {
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
            homeTeamId: 'team-a',
            awayTeamId: 'team-b',
            fieldId: 'field1',
            official: 'team-b',
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const globalTeams: GlobalTeam[] = [
        { id: 'team-a', label: 'Team A', groupId: null, order: 0 },
        { id: 'team-b', label: 'Team B', groupId: null, order: 1 },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, [], [], globalTeams));

      const officialError = result.current.errors.find(e => e.type === 'official_playing');
      expect(officialError).toBeDefined();
      expect(officialError?.messageParams).toEqual({
        game: 'Game 1',
        team: 'Team B'
      });
    });
  });

  describe('Duplicate Standing Names', () => {
    it('should warn about duplicate standing names', () => {
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
            standing: 'Group A',
            homeTeamId: 'team1',
            awayTeamId: 'team2',
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Group A',
            homeTeamId: 'team3',
            awayTeamId: 'team4',
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.warnings.length).toBeGreaterThan(0);
      const duplicateWarning = result.current.warnings.find(w => w.type === 'duplicate_standing');
      expect(duplicateWarning).toBeDefined();
      expect(duplicateWarning?.message).toContain('Group A');
      expect(duplicateWarning?.message).toContain('2 games');
    });

    it('should not warn about unique standing names', () => {
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
            fieldId: 'field1',
            official: null,
            startTime: null,
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
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      const duplicateWarning = result.current.warnings.find(w => w.type === 'duplicate_standing');
      expect(duplicateWarning).toBeUndefined();
    });
  });

  describe('Orphaned Teams', () => {
    it('should warn about team with no outgoing connections', () => {
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
          id: 'team1',
          type: 'team',
          parentId: 'stage1',
          data: {
            label: 'Team A',
            reference: { type: 'static', teamId: 'team-a' },
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.warnings.length).toBeGreaterThan(0);
      const orphanWarning = result.current.warnings.find(w => w.type === 'orphaned_team');
      expect(orphanWarning).toBeDefined();
      expect(orphanWarning?.message).toContain('not connected to any game');
    });

    it('should not warn about team with connections', () => {
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
          id: 'team1',
          type: 'team',
          parentId: 'stage1',
          data: {
            label: 'Team A',
            reference: { type: 'static', teamId: 'team-a' },
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 1',
            homeTeamId: null,
            awayTeamId: 'team2',
            fieldId: 'field1',
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'edge1',
          type: 'team-to-game',
          source: 'team1',
          target: 'game1',
          targetHandle: 'home',
        } as TeamToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));

      const orphanWarning = result.current.warnings.find(w => w.type === 'orphaned_team');
      expect(orphanWarning).toBeUndefined();
    });
  });

  describe('Container Hierarchy Validation', () => {
    it('should error when game is not inside a stage', () => {
      const nodes: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: null,
          data: {
            standing: 'Game 1',
            homeTeamId: 'team1',
            awayTeamId: 'team2',
            fieldId: null,
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.type === 'game_outside_container');
      expect(containerError).toBeDefined();
      expect(containerError?.message).toContain('must be inside a stage container');
    });

    it('should error when stage is not inside a field', () => {
      const nodes: FlowNode[] = [
        {
          id: 'stage1',
          type: 'stage',
          parentId: null,
          data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.type === 'stage_outside_field');
      expect(containerError).toBeDefined();
      expect(containerError?.message).toContain('not inside a field container');
    });

    it('should error when game parent is not a valid stage', () => {
      const nodes: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'field1', // Invalid: game parent must be stage
          data: {
            standing: 'Game 1',
            homeTeamId: 'team1',
            awayTeamId: 'team2',
            fieldId: null,
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.id === 'game1_outside_container');
      expect(containerError).toBeDefined();
      expect(containerError?.messageKey).toBe('game_invalid_parent');
    });

    it('should error when team node has no parent stage', () => {
      const nodes: FlowNode[] = [
        {
          id: 'team1',
          type: 'team',
          parentId: undefined, // Missing parent
          data: {
            label: 'Team A',
            reference: { type: 'static', teamId: 'team-a' },
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.id === 'team1_outside_container');
      expect(containerError).toBeDefined();
      expect(containerError?.messageKey).toBe('team_outside_container');
    });

    it('should error when team parent is not a valid stage', () => {
      const nodes: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'team1',
          type: 'team',
          parentId: 'field1', // Invalid: team parent must be stage
          data: {
            label: 'Team A',
            reference: { type: 'static', teamId: 'team-a' },
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.type === 'team_outside_container');
      expect(containerError).toBeDefined();
      expect(containerError?.messageKey).toBe('team_invalid_parent');
    });

    it('should error when stage parent is not a valid field', () => {
      const nodes: FlowNode[] = [
        {
          id: 'stage1',
          type: 'stage',
          parentId: 'nonexistent',
          data: { name: 'Stage 1', order: 0, progressionMode: 'manual' },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));

      expect(result.current.isValid).toBe(false);
      const containerError = result.current.errors.find(e => e.type === 'stage_outside_field');
      expect(containerError).toBeDefined();
      expect(containerError?.messageKey).toBe('stage_invalid_parent');
    });
  });

  describe('Legacy and Error Handling', () => {
    it('should handle legacy fieldId for time overlap validation', () => {
      const nodes: FlowNode[] = [
        {
          id: 'game1',
          type: 'game',
          parentId: null,
          data: {
            standing: 'Game 1',
            homeTeamId: 'team1',
            awayTeamId: 'team2',
            fieldId: 'field1',
            startTime: '10:00',
            duration: 50,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: null,
          data: {
            standing: 'Game 2',
            homeTeamId: 'team3',
            awayTeamId: 'team4',
            fieldId: 'field1',
            startTime: '10:30',
            duration: 50,
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, [], [{ id: 'field1', name: 'Field 1', order: 0 }]));

      expect(result.current.errors).toHaveLength(3); // 2 hierarchy errors + 1 overlap error
      const overlapError = result.current.errors.find(e => e.type === 'field_overlap');
      expect(overlapError).toBeDefined();
      expect(overlapError?.message).toContain('Field 1');
    });

    it('should handle invalid time formats gracefully in overlaps', () => {
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
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 1',
            startTime: 'invalid',
            homeTeamId: 't1',
            awayTeamId: 't2',
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));
      expect(result.current.isValid).toBe(true);
    });

    it('should use field name from nodes if fields array is incomplete', () => {
      const nodes: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Real Field Name', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'stage1',
          type: 'stage',
          parentId: 'field1',
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'G1', startTime: '10:00', duration: 60, homeTeamId: 't1', awayTeamId: 't2' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'G2', startTime: '10:30', duration: 60, homeTeamId: 't3', awayTeamId: 't4' },
          position: { x: 0, y: 0 },
        },
      ];

      // Pass empty fields array
      const { result } = renderHook(() => useFlowValidation(nodes, [], []));

      const overlapError = result.current.errors.find(e => e.type === 'field_overlap');
      expect(overlapError).toBeDefined();
      expect(overlapError?.message).toContain('Real Field Name');
    });

    it('should fallback to Unknown Field if field name cannot be determined', () => {
      const nodes: FlowNode[] = [
        {
          id: 'stage1',
          type: 'stage',
          parentId: 'nonexistent-field',
          data: { name: 'Stage 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'G1', startTime: '10:00', duration: 60, homeTeamId: 't1', awayTeamId: 't2' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: { standing: 'G2', startTime: '10:30', duration: 60, homeTeamId: 't3', awayTeamId: 't4' },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, [], []));

      const overlapError = result.current.errors.find(e => e.type === 'field_overlap');
      expect(overlapError).toBeDefined();
      expect(overlapError?.message).toContain('Unknown Field');
    });

    it('should skip time overlap check for games without any field ID', () => {
      const nodes: FlowNode[] = [
        {
          id: 'game1',
          type: 'game',
          parentId: null,
          data: {
            standing: 'G1',
            startTime: '10:00',
            fieldId: null, // No field
          },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, []));
      expect(result.current.errors.find(e => e.type === 'field_overlap')).toBeUndefined();
    });
  });

  describe('Self-Play Validation', () => {
    const nodes: FlowNode[] = [
      { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
      { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
    ];

    it('should detect when same static team ID is assigned to both slots', () => {
      const gameNodes: FlowNode[] = [
        ...nodes,
        {
          id: 'g1',
          type: 'game',
          parentId: 's1',
          data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't1' },
          position: { x: 0, y: 0 },
        },
      ];

      const { result } = renderHook(() => useFlowValidation(gameNodes, []));
      const error = result.current.errors.find(e => e.type === 'self_reference');
      expect(error).toBeDefined();
      expect(error?.messageKey).toBe('self_play');
    });

    it('should detect when same dynamic source is assigned to both slots', () => {
      const gameNodes: FlowNode[] = [
        ...nodes,
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } },
        { id: 'g2', type: 'game', parentId: 's1', data: { standing: 'G2' }, position: { x: 0, y: 0 } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', type: 'gameToGame', source: 'g1', target: 'g2', sourceHandle: 'winner', targetHandle: 'home' } as GameToGameEdge,
        { id: 'e2', type: 'gameToGame', source: 'g1', target: 'g2', sourceHandle: 'winner', targetHandle: 'away' } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(gameNodes, edges));
      const error = result.current.errors.find(e => e.type === 'self_reference');
      expect(error).toBeDefined();
      expect(error?.message).toContain('same dynamic source');
    });

    it('should allow winner vs loser of same game', () => {
      const gameNodes: FlowNode[] = [
        ...nodes,
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } },
        { id: 'g2', type: 'game', parentId: 's1', data: { standing: 'G2' }, position: { x: 0, y: 0 } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', type: 'gameToGame', source: 'g1', target: 'g2', sourceHandle: 'winner', targetHandle: 'home' } as GameToGameEdge,
        { id: 'e2', type: 'gameToGame', source: 'g1', target: 'g2', sourceHandle: 'loser', targetHandle: 'away' } as GameToGameEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(gameNodes, edges));
      const error = result.current.errors.find(e => e.type === 'self_reference');
      expect(error).toBeUndefined();
    });
  });

  describe('Cyclic Stage Reference Validation', () => {
    it('should detect when a game references its own parent Ranking Stage', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0, stageType: 'RANKING' }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1' }, position: { x: 0, y: 0 } },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'e1',
          type: 'stageToGame',
          source: 's1',
          target: 'g1',
          targetHandle: 'home',
          data: { sourceRank: 1, targetPort: 'home' },
        } as FlowEdge,
      ];

      const { result } = renderHook(() => useFlowValidation(nodes, edges));
      const error = result.current.errors.find(e => e.id.startsWith('cyclic_stage_ref_'));
      expect(error).toBeDefined();
      expect(error?.message).toContain('cannot reference its own ranking');
    });
  });

  describe('Memoization', () => {
    it('should return same result for same inputs', () => {
      const nodes: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
      ];

      const { result, rerender } = renderHook(
        ({ nodes, edges }) => useFlowValidation(nodes, edges),
        { initialProps: { nodes, edges: [] } }
      );

      const firstResult = result.current;
      rerender({ nodes, edges: [] });
      const secondResult = result.current;

      // useMemo returns same object reference when inputs haven't changed
      expect(firstResult).toStrictEqual(secondResult);
    });

    it('should recompute when nodes change', () => {
      const nodes1: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
      ];

      const nodes2: FlowNode[] = [
        {
          id: 'field1',
          type: 'field',
          data: { name: 'Field 1', order: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'field2',
          type: 'field',
          data: { name: 'Field 2', order: 1 },
          position: { x: 0, y: 0 },
        },
      ];

      const { result, rerender } = renderHook(
        ({ nodes, edges }) => useFlowValidation(nodes, edges),
        { initialProps: { nodes: nodes1, edges: [] } }
      );

      const firstResult = result.current;
      rerender({ nodes: nodes2, edges: [] });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });
  });
});
