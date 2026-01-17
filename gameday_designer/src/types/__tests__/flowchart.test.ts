/**
 * Tests for Flowchart Types
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_GAME_DURATION } from '../../utils/tournamentConstants';
import {
  isGameNodeData,
  isGameNode,
  isGameToGameEdge,
  createGameNode,
  createGameToGameEdge,
  createFlowField,
  createEmptyFlowState,
  createEmptyFlowValidationResult,
  type GameNodeData,
  type GameNode,
  type GameToGameEdge,
} from '../flowchart';

describe('Flowchart Types', () => {
  describe('Type Guards', () => {
    describe('isGameNodeData', () => {
      it('returns true for game node data', () => {
        const data: GameNodeData = {
          type: 'game',
          stage: 'Final',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 5,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamDynamic: null,
          awayTeamDynamic: null,
        };
        expect(isGameNodeData(data)).toBe(true);
      });
    });

    describe('isGameNode', () => {
      it('returns true for game node', () => {
        const node: GameNode = {
          id: 'game-1',
          type: 'game',
          position: { x: 100, y: 100 },
          data: {
            type: 'game',
            stage: 'Preliminary',
            standing: 'HF1',
            fieldId: null,
            official: null,
            breakAfter: 0,
            homeTeamId: null,
            awayTeamId: null,
            homeTeamDynamic: null,
            awayTeamDynamic: null,
          },
        };
        expect(isGameNode(node)).toBe(true);
      });
    });

    describe('isGameToGameEdge', () => {
      it('returns true for game-to-game edge', () => {
        const edge: GameToGameEdge = {
          id: 'edge-1',
          type: 'gameToGame',
          source: 'game-1',
          target: 'game-2',
          sourceHandle: 'loser',
          targetHandle: 'away',
          data: { sourcePort: 'loser', targetPort: 'away' },
        };
        expect(isGameToGameEdge(edge)).toBe(true);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createGameNode', () => {
      it('creates a game node with default values', () => {
        const node = createGameNode('game-1');

        expect(node).toEqual({
          id: 'game-1',
          type: 'game',
          position: { x: 0, y: 0 },
          data: {
            type: 'game',
            stage: 'Preliminary',
            stageType: 'STANDARD',
            standing: '',
            fieldId: null,
            official: null,
            breakAfter: 0,
            homeTeamId: null,
            awayTeamId: null,
            homeTeamDynamic: null,
            awayTeamDynamic: null,
            startTime: undefined,
            duration: DEFAULT_GAME_DURATION,
            manualTime: false,
          },
        });
      });

      it('creates a game node with custom position', () => {
        const node = createGameNode('game-2', { x: 300, y: 150 });

        expect(node.position).toEqual({ x: 300, y: 150 });
      });

      it('creates a game node with custom options', () => {
        const node = createGameNode('game-3', { x: 0, y: 0 }, {
          stage: 'Final',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 10,
        });

        expect(node.data).toEqual({
          type: 'game',
          stage: 'Final',
          stageType: 'STANDARD',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 10,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          startTime: undefined,
          duration: DEFAULT_GAME_DURATION,
          manualTime: false,
        });
      });

      it('creates a game node with partial options', () => {
        const node = createGameNode('game-4', { x: 0, y: 0 }, {
          standing: 'HF1',
        });

        expect(node.data.standing).toBe('HF1');
        expect(node.data.stage).toBe('Preliminary'); // default
        expect(node.data.fieldId).toBeNull(); // default
      });
    });

    describe('createGameToGameEdge', () => {
      it('creates a winner edge', () => {
        const edge = createGameToGameEdge(
          'edge-1',
          'game-1',
          'winner',
          'game-2',
          'home'
        );

        expect(edge).toEqual({
          id: 'edge-1',
          type: 'gameToGame',
          source: 'game-1',
          target: 'game-2',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { sourcePort: 'winner', targetPort: 'home' },
        });
      });

      it('creates a loser edge', () => {
        const edge = createGameToGameEdge(
          'edge-2',
          'game-1',
          'loser',
          'game-3',
          'away'
        );

        expect(edge.sourceHandle).toBe('loser');
        expect(edge.data.sourcePort).toBe('loser');
        expect(edge.targetHandle).toBe('away');
      });
    });

    describe('createFlowField', () => {
      it('creates a field with given parameters', () => {
        const field = createFlowField('field-1', 'Feld 1', 0);

        expect(field).toEqual({
          id: 'field-1',
          name: 'Feld 1',
          order: 0,
        });
      });

      it('creates multiple fields with different orders', () => {
        const field1 = createFlowField('field-1', 'Main Field', 0);
        const field2 = createFlowField('field-2', 'Side Field', 1);

        expect(field1.order).toBe(0);
        expect(field2.order).toBe(1);
      });
    });

    describe('createEmptyFlowState', () => {
      it('creates an empty flow state', () => {
        const state = createEmptyFlowState();

        expect(state).toEqual({
          metadata: {
            id: 0,
            name: '',
            date: new Date().toISOString().split('T')[0],
            start: '10:00',
            format: '6_2',
            author: 0,
            address: '',
            season: 0,
            league: 0,
            status: 'DRAFT',
          },
          nodes: [],
          edges: [],
          fields: [],
          globalTeams: [],
          globalTeamGroups: [],
        });
      });

      it('creates independent instances', () => {
        const state1 = createEmptyFlowState();
        const state2 = createEmptyFlowState();

        state1.nodes.push(createGameNode('game-1'));

        expect(state2.nodes).toHaveLength(0);
      });
    });

    describe('createEmptyFlowValidationResult', () => {
      it('creates an empty validation result', () => {
        const result = createEmptyFlowValidationResult();

        expect(result).toEqual({
          isValid: true,
          errors: [],
          warnings: [],
        });
      });
    });
  });

  describe('Type Structure Validation', () => {
    it('GameNodeData has required properties', () => {
      const data: GameNodeData = {
        type: 'game',
        stage: 'Preliminary',
        standing: 'HF1',
        fieldId: null,
        official: null,
        breakAfter: 0,
        homeTeamId: null,
        awayTeamId: null,
        homeTeamDynamic: null,
        awayTeamDynamic: null,
      };

      expect(data.type).toBe('game');
      expect(data.stage).toBeDefined();
      expect(data.standing).toBeDefined();
    });
  });
});
