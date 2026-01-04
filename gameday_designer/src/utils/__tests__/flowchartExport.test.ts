/**
 * Tests for Flowchart Export Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportToScheduleJson,
  validateForExport,
} from '../flowchartExport';
import {
  createTeamNode,
  createGameNode,
  createFlowField,
  createTeamToGameEdge,
  createGameToGameEdge,
  type FlowState,
} from '../../types/flowchart';

describe('Flowchart Export Utility', () => {
  describe('exportToScheduleJson', () => {
    it('exports a simple 2-team game correctly', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            stage: 'Vorrunde',
            standing: 'Spiel 1',
            fieldId: 'field-1',
            official: { type: 'static', name: 'Officials' },
            breakAfter: 0,
          }),
        ],
        edges: [
          createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        field: 'Feld 1',
        games: [
          {
            stage: 'Vorrunde',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: 'Officials',
          },
        ],
      });
    });

    it('exports winner/loser references correctly', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createTeamNode('team-3', { type: 'groupTeam', group: 0, team: 2 }, '0_2'),
          createTeamNode('team-4', { type: 'groupTeam', group: 0, team: 3 }, '0_3'),
          createGameNode('game-hf1', { x: 0, y: 0 }, {
            stage: 'Finalrunde',
            standing: 'HF1',
            fieldId: 'field-1',
          }),
          createGameNode('game-hf2', { x: 0, y: 0 }, {
            stage: 'Finalrunde',
            standing: 'HF2',
            fieldId: 'field-1',
          }),
          createGameNode('game-final', { x: 0, y: 0 }, {
            stage: 'Finalrunde',
            standing: 'P1',
            fieldId: 'field-1',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-hf1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-hf1', 'away'),
          createTeamToGameEdge('e3', 'team-3', 'game-hf2', 'home'),
          createTeamToGameEdge('e4', 'team-4', 'game-hf2', 'away'),
          createGameToGameEdge('e5', 'game-hf1', 'winner', 'game-final', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'winner', 'game-final', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      const games = result.data![0].games;
      expect(games).toHaveLength(3);

      // Find the final game
      const finalGame = games.find((g) => g.standing === 'P1');
      expect(finalGame).toBeDefined();
      expect(finalGame!.home).toBe('Gewinner HF1');
      expect(finalGame!.away).toBe('Gewinner HF2');
    });

    it('exports loser references correctly', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createTeamNode('team-3', { type: 'groupTeam', group: 0, team: 2 }, '0_2'),
          createTeamNode('team-4', { type: 'groupTeam', group: 0, team: 3 }, '0_3'),
          createGameNode('game-hf1', { x: 0, y: 0 }, {
            standing: 'HF1',
            fieldId: 'field-1',
          }),
          createGameNode('game-hf2', { x: 0, y: 0 }, {
            standing: 'HF2',
            fieldId: 'field-1',
          }),
          createGameNode('game-p3', { x: 0, y: 0 }, {
            standing: 'P3',
            fieldId: 'field-1',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-hf1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-hf1', 'away'),
          createTeamToGameEdge('e3', 'team-3', 'game-hf2', 'home'),
          createTeamToGameEdge('e4', 'team-4', 'game-hf2', 'away'),
          createGameToGameEdge('e5', 'game-hf1', 'loser', 'game-p3', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'loser', 'game-p3', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);

      const p3Game = result.data![0].games.find((g) => g.standing === 'P3');
      expect(p3Game).toBeDefined();
      expect(p3Game!.home).toBe('Verlierer HF1');
      expect(p3Game!.away).toBe('Verlierer HF2');
    });

    it('exports break_after when non-zero', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
            breakAfter: 10,
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBe(10);
    });

    it('does not include break_after when zero', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
            breakAfter: 0,
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBeUndefined();
    });

    it('fails when game has no field assigned', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: null, // No field assigned
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Games without field assignment: Spiel 1');
    });

    it('fails when game has incomplete connections', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          // Missing away connection
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('incomplete'))).toBe(true);
    });

    it('groups games by field correctly', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createTeamNode('team-3', { type: 'groupTeam', group: 0, team: 2 }, '0_2'),
          createTeamNode('team-4', { type: 'groupTeam', group: 0, team: 3 }, '0_3'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
          }),
          createGameNode('game-2', { x: 0, y: 0 }, {
            standing: 'Spiel 2',
            fieldId: 'field-2',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
          createTeamToGameEdge('e3', 'team-3', 'game-2', 'home'),
          createTeamToGameEdge('e4', 'team-4', 'game-2', 'away'),
        ],
        fields: [
          createFlowField('field-1', 'Feld 1', 0),
          createFlowField('field-2', 'Feld 2', 1),
        ],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].field).toBe('Feld 1');
      expect(result.data![0].games).toHaveLength(1);
      expect(result.data![1].field).toBe('Feld 2');
      expect(result.data![1].games).toHaveLength(1);
    });
  });

  describe('validateForExport', () => {
    it('returns empty array for valid state', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
          createTeamToGameEdge('e2', 'team-2', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const errors = validateForExport(state);
      expect(errors).toHaveLength(0);
    });

    it('returns error when no fields exist', () => {
      const state: FlowState = {
        nodes: [createGameNode('game-1')],
        edges: [],
        fields: [],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one field is required');
    });

    it('returns error when no games exist', () => {
      const state: FlowState = {
        nodes: [],
        edges: [],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one game is required');
    });

    it('returns error for game without standing', () => {
      const state: FlowState = {
        nodes: [
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: '',
            fieldId: 'field-1',
          }),
        ],
        edges: [],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('no standing'))).toBe(true);
    });

    it('returns error for game missing home team', () => {
      const state: FlowState = {
        nodes: [
          createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0'),
          createGameNode('game-1', { x: 0, y: 0 }, {
            standing: 'Spiel 1',
            fieldId: 'field-1',
          }),
        ],
        edges: [
          createTeamToGameEdge('e1', 'team-1', 'game-1', 'away'),
        ],
        fields: [createFlowField('field-1', 'Feld 1', 0)],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('missing home'))).toBe(true);
    });
  });
});
