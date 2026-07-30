/**
 * Tests for Flowchart Export Utility
 */

import { describe, it, expect } from 'vitest';
import {
  exportToScheduleJson,
  validateForExport,
} from '../flowchartExport';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createGameToGameEdge,
  type FlowState,
  type GlobalTeam,
  type GlobalTeamGroup,
} from '../../types/flowchart';

describe('Flowchart Export Utility', () => {
  describe('exportToScheduleJson', () => {
    it('exports a simple 2-team game correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const team1: GlobalTeam = { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 };
      const team2: GlobalTeam = { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 };

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Preliminary' });
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1',
        official: { type: 'static', name: 'Officials' },
        breakAfter: 0,
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: [team1, team2],
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        field: 'Feld 1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: 'Officials',
          },
        ],
      });
    });

    it('exports winner/loser references correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Final' });
      const gameHf1 = createGameNodeInStage('game-hf1', 'stage-1', {
        standing: 'HF1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const gameHf2 = createGameNodeInStage('game-hf2', 'stage-1', {
        standing: 'HF2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });
      const gameFinal = createGameNodeInStage('game-final', 'stage-1', {
        standing: 'P1',
        homeTeamDynamic: { type: 'winner', matchName: 'HF1' },
        awayTeamDynamic: { type: 'winner', matchName: 'HF2' },
      });

      const state: FlowState = {
        nodes: [field, stage, gameHf1, gameHf2, gameFinal],
        edges: [
          createGameToGameEdge('e5', 'game-hf1', 'winner', 'game-final', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'winner', 'game-final', 'away'),
        ],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      const games = result.data![0].games;
      expect(games).toHaveLength(3);

      const finalGame = games.find((g) => g.standing === 'P1');
      expect(finalGame).toBeDefined();
      expect(finalGame!.home).toBe('Gewinner HF1');
      expect(finalGame!.away).toBe('Gewinner HF2');
    });

    it('exports loser references correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1', { name: 'Final' });
      const gameHf1 = createGameNodeInStage('game-hf1', 'stage-1', {
        standing: 'HF1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const gameHf2 = createGameNodeInStage('game-hf2', 'stage-1', {
        standing: 'HF2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });
      const gameP3 = createGameNodeInStage('game-p3', 'stage-1', {
        standing: 'P3',
        homeTeamDynamic: { type: 'loser', matchName: 'HF1' },
        awayTeamDynamic: { type: 'loser', matchName: 'HF2' },
      });

      const state: FlowState = {
        nodes: [field, stage, gameHf1, gameHf2, gameP3],
        edges: [
          createGameToGameEdge('e5', 'game-hf1', 'loser', 'game-p3', 'home'),
          createGameToGameEdge('e6', 'game-hf2', 'loser', 'game-p3', 'away'),
        ],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);

      const p3Game = result.data![0].games.find((g) => g.standing === 'P3');
      expect(p3Game).toBeDefined();
      expect(p3Game!.home).toBe('Verlierer HF1');
      expect(p3Game!.away).toBe('Verlierer HF2');
    });

    it('exports break_after when non-zero', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', breakAfter: 10, homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBe(10);
    });

    it('does not include break_after when zero', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', breakAfter: 0, homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(true);
      expect(result.data![0].games[0].break_after).toBeUndefined();
    });

    it('fails when game has no field assigned', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      // Orphan game: no stage parent, no legacy fieldId either
      const orphanGame = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 0, y: 0 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          standing: 'Spiel 1',
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

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Games without field assignment: Spiel 1');
    });

    it('fails when game has incomplete connections', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: null,
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const result = exportToScheduleJson(state);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('incomplete'))).toBe(true);
    });

    it('groups games by field correctly', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
        { id: 'team-3', groupId: 'group-1', label: '0_2', order: 2 },
        { id: 'team-4', groupId: 'group-1', label: '0_3', order: 3 },
      ];

      const field1 = createFieldNode('field-1', { name: 'Feld 1', order: 0 });
      const field2 = createFieldNode('field-2', { name: 'Feld 2', order: 1 });
      const stage1 = createStageNode('stage-1', 'field-1');
      const stage2 = createStageNode('stage-2', 'field-2');
      const game1 = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });
      const game2 = createGameNodeInStage('game-2', 'stage-2', {
        standing: 'Spiel 2', homeTeamId: 'team-3', awayTeamId: 'team-4',
      });

      const state: FlowState = {
        nodes: [field1, field2, stage1, stage2, game1, game2],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
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
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
        { id: 'team-2', groupId: 'group-1', label: '0_1', order: 1 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: 'team-1', awayTeamId: 'team-2',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);
      expect(errors).toHaveLength(0);
    });

    it('returns error when no fields exist', () => {
      const orphanGame = {
        id: 'game-1',
        type: 'game' as const,
        position: { x: 0, y: 0 },
        data: {
          type: 'game' as const,
          stage: 'Preliminary',
          standing: 'Spiel 1',
          fieldId: null,
          official: null,
          breakAfter: 0,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamDynamic: null,
          awayTeamDynamic: null,
          duration: 50,
          manualTime: false,
        },
      };

      const state: FlowState = {
        nodes: [orphanGame],
        edges: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one field is required');
    });

    it('returns error when no games exist', () => {
      const field = createFieldNode('field-1', { name: 'Feld 1' });

      const state: FlowState = {
        nodes: [field],
        edges: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors).toContain('At least one game is required');
    });

    it('returns error for game without standing', () => {
      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', { standing: '' });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: [],
        globalTeamGroups: [],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('no standing'))).toBe(true);
    });

    it('returns error for game missing home team', () => {
      const group: GlobalTeamGroup = { id: 'group-1', name: 'Gruppe A', order: 0 };
      const teams: GlobalTeam[] = [
        { id: 'team-1', groupId: 'group-1', label: '0_0', order: 0 },
      ];

      const field = createFieldNode('field-1', { name: 'Feld 1' });
      const stage = createStageNode('stage-1', 'field-1');
      const game = createGameNodeInStage('game-1', 'stage-1', {
        standing: 'Spiel 1', homeTeamId: null, awayTeamId: 'team-1',
      });

      const state: FlowState = {
        nodes: [field, stage, game],
        edges: [],
        globalTeams: teams,
        globalTeamGroups: [group],
      };

      const errors = validateForExport(state);
      expect(errors.some((e) => e.includes('missing home'))).toBe(true);
    });
  });
});
