/**
 * Tests for Flowchart Export - Container Hierarchy
 *
 * TDD RED Phase: Tests for exporting flowcharts with container hierarchy.
 * Field and stage should be derived from the node parent chain.
 */

import { describe, it, expect } from 'vitest';
import { exportToScheduleJson, validateForExport } from '../flowchartExport';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createTeamNode,
  createTeamToGameEdge,
  type FlowState,
  type FlowEdge,
  type FlowField,
} from '../../types/flowchart';

describe('Flowchart Export - Container Hierarchy', () => {
  describe('exportToScheduleJson with container hierarchy', () => {
    it('derives field from game parent chain (game -> stage -> field)', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Vorrunde' });
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
      ];

      // No legacy FlowField needed - field derived from container hierarchy
      const state: FlowState = {
        nodes: [field, stage, game, homeTeam, awayTeam],
        edges,
        fields: [], // Empty - using container hierarchy
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].field).toBe('Main Field');
      expect(result.data![0].games).toHaveLength(1);
      expect(result.data![0].games[0].stage).toBe('Vorrunde');
    });

    it('derives stage name from parent stage node', () => {
      const field = createFieldNode('field-1', { name: 'Field A' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Finalrunde', stageType: 'finalrunde' });
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'Finale' });
      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
      ];

      const state: FlowState = {
        nodes: [field, stage, game, homeTeam, awayTeam],
        edges,
        fields: [],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].stage).toBe('Finalrunde');
    });

    it('groups games by their container field', () => {
      const field1 = createFieldNode('field-1', { name: 'Feld 1' });
      const field2 = createFieldNode('field-2', { name: 'Feld 2' });
      const stage1 = createStageNode('stage-1', 'field-1', { name: 'Vorrunde' });
      const stage2 = createStageNode('stage-2', 'field-2', { name: 'Vorrunde' });

      const game1 = createGameNodeInStage('game-1', 'stage-1', { standing: 'G1' });
      const game2 = createGameNodeInStage('game-2', 'stage-2', { standing: 'G2' });

      const team1 = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const team2 = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');
      const team3 = createTeamNode('team-3', { type: 'groupTeam', group: 1, team: 0 }, '1_0');
      const team4 = createTeamNode('team-4', { type: 'groupTeam', group: 1, team: 1 }, '1_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
        createTeamToGameEdge('edge-3', 'team-3', 'game-2', 'home'),
        createTeamToGameEdge('edge-4', 'team-4', 'game-2', 'away'),
      ];

      const state: FlowState = {
        nodes: [field1, field2, stage1, stage2, game1, game2, team1, team2, team3, team4],
        edges,
        fields: [],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const feld1Schedule = result.data!.find((s) => s.field === 'Feld 1');
      const feld2Schedule = result.data!.find((s) => s.field === 'Feld 2');

      expect(feld1Schedule).toBeDefined();
      expect(feld1Schedule!.games).toHaveLength(1);
      expect(feld1Schedule!.games[0].standing).toBe('G1');

      expect(feld2Schedule).toBeDefined();
      expect(feld2Schedule!.games).toHaveLength(1);
      expect(feld2Schedule!.games[0].standing).toBe('G2');
    });

    it('handles multiple stages in the same field', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const vorrunde = createStageNode('stage-vr', 'field-1', { name: 'Vorrunde', stageType: 'vorrunde' });
      const finalrunde = createStageNode('stage-fr', 'field-1', { name: 'Finalrunde', stageType: 'finalrunde' });

      const gameVr = createGameNodeInStage('game-vr', 'stage-vr', { standing: 'VR1' });
      const gameFr = createGameNodeInStage('game-fr', 'stage-fr', { standing: 'Finale' });

      const team1 = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const team2 = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-vr', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-vr', 'away'),
        createTeamToGameEdge('edge-3', 'team-1', 'game-fr', 'home'),
        createTeamToGameEdge('edge-4', 'team-2', 'game-fr', 'away'),
      ];

      const state: FlowState = {
        nodes: [field, vorrunde, finalrunde, gameVr, gameFr, team1, team2],
        edges,
        fields: [],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].field).toBe('Main Field');
      expect(result.data![0].games).toHaveLength(2);

      const vrGame = result.data![0].games.find((g) => g.standing === 'VR1');
      const frGame = result.data![0].games.find((g) => g.standing === 'Finale');

      expect(vrGame).toBeDefined();
      expect(vrGame!.stage).toBe('Vorrunde');

      expect(frGame).toBeDefined();
      expect(frGame!.stage).toBe('Finalrunde');
    });

    it('falls back to legacy FlowField when container hierarchy not present', () => {
      // Game with fieldId but no container parent (v1 model)
      const gameNode = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 100, y: 100 },
        data: {
          type: 'game' as const,
          stage: 'Vorrunde',
          standing: 'VR1',
          fieldId: 'legacy-field-1',
          official: null,
          breakAfter: 0,
        },
      };

      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
      ];

      const legacyFields: FlowField[] = [
        { id: 'legacy-field-1', name: 'Legacy Field', order: 0 },
      ];

      const state: FlowState = {
        nodes: [gameNode, homeTeam, awayTeam],
        edges,
        fields: legacyFields,
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].field).toBe('Legacy Field');
    });
  });

  describe('validateForExport with container hierarchy', () => {
    it('validates that games have a container field', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: 'HF1' });
      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
      ];

      const state: FlowState = {
        nodes: [field, stage, game, homeTeam, awayTeam],
        edges,
        fields: [],
      };

      const errors = validateForExport(state);

      // Should not have field-related errors since field is in container hierarchy
      const fieldErrors = errors.filter((e) => e.includes('field'));
      expect(fieldErrors).toHaveLength(0);
    });

    it('reports error when game has no container field and no legacy field', () => {
      // Game with no parent and no fieldId
      const orphanGame = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 100, y: 100 },
        data: {
          type: 'game' as const,
          stage: 'Vorrunde',
          standing: 'HF1',
          fieldId: null,
          official: null,
          breakAfter: 0,
        },
      };

      const homeTeam = createTeamNode('team-1', { type: 'groupTeam', group: 0, team: 0 }, '0_0');
      const awayTeam = createTeamNode('team-2', { type: 'groupTeam', group: 0, team: 1 }, '0_1');

      const edges: FlowEdge[] = [
        createTeamToGameEdge('edge-1', 'team-1', 'game-1', 'home'),
        createTeamToGameEdge('edge-2', 'team-2', 'game-1', 'away'),
      ];

      const state: FlowState = {
        nodes: [orphanGame, homeTeam, awayTeam],
        edges,
        fields: [],
      };

      const errors = validateForExport(state);

      expect(errors.some((e) => e.includes('field'))).toBe(true);
    });
  });
});
