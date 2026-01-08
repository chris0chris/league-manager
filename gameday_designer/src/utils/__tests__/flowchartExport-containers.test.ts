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
  type FlowState,
  type FlowField,
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';

describe('Flowchart Export - Container Hierarchy', () => {
  describe('exportToScheduleJson with container hierarchy', () => {
    it('derives field from game parent chain (game -> stage -> field)', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Vorrunde' });
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'HF1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      // No legacy FlowField needed - field derived from container hierarchy
      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [], // Empty - using container hierarchy
        globalTeams: teams,
        globalTeamGroups: [group],
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
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Finale',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
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

      const game1 = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'G1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });
      const game2 = createGameNodeInStage('game-2', 'stage-2', {
        standing: 'G2',
        homeTeamId: 'team-3',
        awayTeamId: 'team-4',
      });

      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '1_0', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '1_1', order: 3 },
      ];

      const state: FlowState = {
        nodes: [field1, field2, stage1, stage2, game1, game2],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
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

      const gameVr = createGameNodeInStage('game-vr', 'stage-vr', {
        standing: 'VR1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });
      const gameFr = createGameNodeInStage('game-fr', 'stage-fr', {
        standing: 'Finale',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const state: FlowState = {
        nodes: [field, vorrunde, finalrunde, gameVr, gameFr],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
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
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

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
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const legacyFields: FlowField[] = [
        { id: 'legacy-field-1', name: 'Legacy Field', order: 0 },
      ];

      const state: FlowState = {
        nodes: [gameNode],
        edges: [],
        fields: legacyFields,
        globalTeams: teams,
        globalTeamGroups: [group],
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
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'HF1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);

      // Should not have field-related errors since field is in container hierarchy
      const fieldErrors = errors.filter((e) => e.includes('field'));
      expect(fieldErrors).toHaveLength(0);
    });

    it('reports error when game has no container field and no legacy field', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

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
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const state: FlowState = {
        nodes: [orphanGame],
        edges: [],
        fields: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);

      expect(errors.some((e) => e.includes('field'))).toBe(true);
    });
  });
});
