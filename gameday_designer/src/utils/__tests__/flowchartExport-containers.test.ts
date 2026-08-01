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
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';
import type { ScheduleJson } from '../../types/designer';

describe('Flowchart Export - Container Hierarchy', () => {
  describe('exportToScheduleJson with container hierarchy', () => {
    it('derives field from game parent chain (game -> stage -> field)', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Preliminary' });
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
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);
      const data = result.data as ScheduleJson[] | undefined;

      expect(result.success).toBe(true);
      expect(data).toHaveLength(1);
      expect(data![0].field).toBe('Main Field');
      expect(data![0].games).toHaveLength(1);
      expect(data![0].games[0].stage).toBe('Preliminary');
    });

    it('derives stage name from parent stage node', () => {
      const field = createFieldNode('field-1', { name: 'Field A' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Final', category: 'final' });
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
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);
      const data = result.data as ScheduleJson[] | undefined;

      expect(result.success).toBe(true);
      expect(data![0].games[0].stage).toBe('Final');
    });

    it('groups games by their container field', () => {
      const field1 = createFieldNode('field-1', { name: 'Feld 1' });
      const field2 = createFieldNode('field-2', { name: 'Feld 2' });
      const stage1 = createStageNode('stage-1', 'field-1', { name: 'Preliminary' });
      const stage2 = createStageNode('stage-2', 'field-2', { name: 'Preliminary' });

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
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);
      const data = result.data as ScheduleJson[] | undefined;

      expect(result.success).toBe(true);
      expect(data).toHaveLength(2);

      const feld1Schedule = data!.find((s) => s.field === 'Feld 1');
      const feld2Schedule = data!.find((s) => s.field === 'Feld 2');

      expect(feld1Schedule).toBeDefined();
      expect(feld1Schedule!.games).toHaveLength(1);
      expect(feld1Schedule!.games[0].standing).toBe('G1');

      expect(feld2Schedule).toBeDefined();
      expect(feld2Schedule!.games).toHaveLength(1);
      expect(feld2Schedule!.games[0].standing).toBe('G2');
    });

    it('handles multiple stages in the same field', () => {
      const field = createFieldNode('field-1', { name: 'Main Field' });
      const preliminary = createStageNode('stage-vr', 'field-1', { name: 'Preliminary', category: 'preliminary' });
      const final = createStageNode('stage-fr', 'field-1', { name: 'Final', category: 'final' });

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
        nodes: [field, preliminary, final, gameVr, gameFr],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);
      const data = result.data as ScheduleJson[] | undefined;

      expect(result.success).toBe(true);
      expect(data).toHaveLength(1);
      expect(data![0].field).toBe('Main Field');
      expect(data![0].games).toHaveLength(2);

      const vrGame = data![0].games.find((g: { standing: string }) => g.standing === 'VR1');
      const frGame = data![0].games.find((g: { standing: string }) => g.standing === 'Finale');

      expect(vrGame).toBeDefined();
      expect(vrGame!.stage).toBe('Preliminary');

      expect(frGame).toBeDefined();
      expect(frGame!.stage).toBe('Final');
    });

    it('falls back to the raw fieldId as the field name when no container field matches', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      // Game with fieldId but no container parent (v1 model) and no matching field node
      const gameNode = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 100, y: 100 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          stageType: 'STANDARD' as const,
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

      const state: FlowState = {
        nodes: [gameNode],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);
      const data = result.data as ScheduleJson[] | undefined;

      expect(result.success).toBe(true);
      expect(data).toHaveLength(1);
      expect(data![0].field).toBe('legacy-field-1');
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
          stage: 'Preliminary',
          stageType: 'STANDARD' as const,
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
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);

      expect(errors.some((e) => e.includes('field'))).toBe(true);
    });
  });
});
