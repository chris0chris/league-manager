/**
 * Tests for Flowchart Types
 */

import { describe, it, expect } from 'vitest';
import {
  isTeamNodeData,
  isGameNodeData,
  isTeamNode,
  isGameNode,
  isTeamToGameEdge,
  isGameToGameEdge,
  createTeamNode,
  createGameNode,
  createTeamToGameEdge,
  createGameToGameEdge,
  createFlowField,
  createEmptyFlowState,
  createEmptyFlowValidationResult,
  type TeamNodeData,
  type GameNodeData,
  type TeamNode,
  type GameNode,
  type TeamToGameEdge,
  type GameToGameEdge,
  type FlowNode,
  type FlowEdge,
} from '../flowchart';

describe('Flowchart Types', () => {
  describe('Type Guards', () => {
    describe('isTeamNodeData', () => {
      it('returns true for team node data', () => {
        const data: TeamNodeData = {
          type: 'team',
          reference: { type: 'groupTeam', group: 0, team: 0 },
          label: 'Team A',
        };
        expect(isTeamNodeData(data)).toBe(true);
      });

      it('returns false for game node data', () => {
        const data: GameNodeData = {
          type: 'game',
          stage: 'Vorrunde',
          standing: 'HF1',
          fieldId: null,
          official: null,
          breakAfter: 0,
        };
        expect(isTeamNodeData(data)).toBe(false);
      });
    });

    describe('isGameNodeData', () => {
      it('returns true for game node data', () => {
        const data: GameNodeData = {
          type: 'game',
          stage: 'Finalrunde',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 5,
        };
        expect(isGameNodeData(data)).toBe(true);
      });

      it('returns false for team node data', () => {
        const data: TeamNodeData = {
          type: 'team',
          reference: { type: 'static', name: 'Team A' },
          label: 'Team A',
        };
        expect(isGameNodeData(data)).toBe(false);
      });
    });

    describe('isTeamNode', () => {
      it('returns true for team node', () => {
        const node: TeamNode = {
          id: 'team-1',
          type: 'team',
          position: { x: 0, y: 0 },
          data: {
            type: 'team',
            reference: { type: 'groupTeam', group: 0, team: 0 },
            label: '0_0',
          },
        };
        expect(isTeamNode(node)).toBe(true);
      });

      it('returns false for game node', () => {
        const node: GameNode = {
          id: 'game-1',
          type: 'game',
          position: { x: 100, y: 100 },
          data: {
            type: 'game',
            stage: 'Vorrunde',
            standing: 'HF1',
            fieldId: null,
            official: null,
            breakAfter: 0,
          },
        };
        expect(isTeamNode(node as FlowNode)).toBe(false);
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
            stage: 'Vorrunde',
            standing: 'HF1',
            fieldId: null,
            official: null,
            breakAfter: 0,
          },
        };
        expect(isGameNode(node)).toBe(true);
      });

      it('returns false for team node', () => {
        const node: TeamNode = {
          id: 'team-1',
          type: 'team',
          position: { x: 0, y: 0 },
          data: {
            type: 'team',
            reference: { type: 'groupTeam', group: 0, team: 0 },
            label: '0_0',
          },
        };
        expect(isGameNode(node as FlowNode)).toBe(false);
      });
    });

    describe('isTeamToGameEdge', () => {
      it('returns true for team-to-game edge', () => {
        const edge: TeamToGameEdge = {
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        };
        expect(isTeamToGameEdge(edge)).toBe(true);
      });

      it('returns false for game-to-game edge', () => {
        const edge: GameToGameEdge = {
          id: 'edge-1',
          type: 'gameToGame',
          source: 'game-1',
          target: 'game-2',
          sourceHandle: 'winner',
          targetHandle: 'home',
          data: { sourcePort: 'winner', targetPort: 'home' },
        };
        expect(isTeamToGameEdge(edge as FlowEdge)).toBe(false);
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

      it('returns false for team-to-game edge', () => {
        const edge: TeamToGameEdge = {
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        };
        expect(isGameToGameEdge(edge as FlowEdge)).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createTeamNode', () => {
      it('creates a team node with required parameters', () => {
        const node = createTeamNode(
          'team-1',
          { type: 'groupTeam', group: 0, team: 1 },
          '0_1'
        );

        expect(node).toEqual({
          id: 'team-1',
          type: 'team',
          position: { x: 0, y: 0 },
          data: {
            type: 'team',
            reference: { type: 'groupTeam', group: 0, team: 1 },
            label: '0_1',
          },
        });
      });

      it('creates a team node with custom position', () => {
        const node = createTeamNode(
          'team-2',
          { type: 'static', name: 'Team A' },
          'Team A',
          { x: 100, y: 200 }
        );

        expect(node.position).toEqual({ x: 100, y: 200 });
      });

      it('creates a team node with standing reference', () => {
        const node = createTeamNode(
          'team-3',
          { type: 'standing', place: 1, groupName: 'Gruppe 1' },
          'P1 Gruppe 1'
        );

        expect(node.data.reference).toEqual({
          type: 'standing',
          place: 1,
          groupName: 'Gruppe 1',
        });
      });
    });

    describe('createGameNode', () => {
      it('creates a game node with default values', () => {
        const node = createGameNode('game-1');

        expect(node).toEqual({
          id: 'game-1',
          type: 'game',
          position: { x: 0, y: 0 },
          data: {
            type: 'game',
            stage: 'Vorrunde',
            standing: '',
            fieldId: null,
            official: null,
            breakAfter: 0,
          },
        });
      });

      it('creates a game node with custom position', () => {
        const node = createGameNode('game-2', { x: 300, y: 150 });

        expect(node.position).toEqual({ x: 300, y: 150 });
      });

      it('creates a game node with custom options', () => {
        const node = createGameNode('game-3', { x: 0, y: 0 }, {
          stage: 'Finalrunde',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 10,
        });

        expect(node.data).toEqual({
          type: 'game',
          stage: 'Finalrunde',
          standing: 'P1',
          fieldId: 'field-1',
          official: { type: 'static', name: 'Officials' },
          breakAfter: 10,
        });
      });

      it('creates a game node with partial options', () => {
        const node = createGameNode('game-4', { x: 0, y: 0 }, {
          standing: 'HF1',
        });

        expect(node.data.standing).toBe('HF1');
        expect(node.data.stage).toBe('Vorrunde'); // default
        expect(node.data.fieldId).toBeNull(); // default
      });
    });

    describe('createTeamToGameEdge', () => {
      it('creates a team-to-game edge for home port', () => {
        const edge = createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home');

        expect(edge).toEqual({
          id: 'edge-1',
          type: 'teamToGame',
          source: 'team-1',
          target: 'game-1',
          sourceHandle: 'output',
          targetHandle: 'home',
          data: { targetPort: 'home' },
        });
      });

      it('creates a team-to-game edge for away port', () => {
        const edge = createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away');

        expect(edge.targetHandle).toBe('away');
        expect(edge.data.targetPort).toBe('away');
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
          nodes: [],
          edges: [],
          fields: [],
        });
      });

      it('creates independent instances', () => {
        const state1 = createEmptyFlowState();
        const state2 = createEmptyFlowState();

        state1.nodes.push(createTeamNode('team-1', { type: 'static', name: 'A' }, 'A'));

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
    it('TeamNodeData has required properties', () => {
      const data: TeamNodeData = {
        type: 'team',
        reference: { type: 'groupTeam', group: 0, team: 0 },
        label: 'Test',
      };

      expect(data.type).toBe('team');
      expect(data.reference).toBeDefined();
      expect(data.label).toBeDefined();
    });

    it('GameNodeData has required properties', () => {
      const data: GameNodeData = {
        type: 'game',
        stage: 'Vorrunde',
        standing: 'HF1',
        fieldId: null,
        official: null,
        breakAfter: 0,
      };

      expect(data.type).toBe('game');
      expect(data.stage).toBeDefined();
      expect(data.standing).toBeDefined();
    });

    it('FlowNode can be either TeamNode or GameNode', () => {
      const nodes: FlowNode[] = [
        createTeamNode('team-1', { type: 'static', name: 'A' }, 'A'),
        createGameNode('game-1'),
      ];

      expect(nodes).toHaveLength(2);
      expect(isTeamNode(nodes[0])).toBe(true);
      expect(isGameNode(nodes[1])).toBe(true);
    });

    it('FlowEdge can be either TeamToGameEdge or GameToGameEdge', () => {
      const edges: FlowEdge[] = [
        createTeamToGameEdge('e1', 'team-1', 'game-1', 'home'),
        createGameToGameEdge('e2', 'game-1', 'winner', 'game-2', 'home'),
      ];

      expect(edges).toHaveLength(2);
      expect(isTeamToGameEdge(edges[0])).toBe(true);
      expect(isGameToGameEdge(edges[1])).toBe(true);
    });
  });
});
