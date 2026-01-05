/**
 * Tests for team assignment utilities
 *
 * Tests team generation, color assignment, and tournament team distribution.
 */

import { describe, it, expect } from 'vitest';
import { getTeamColor, generateTeamsForTournament, assignTeamsToTournamentGames } from '../teamAssignment';
import type { GlobalTeam, GameNode, StageNode } from '../../types/flowchart';
import type { TournamentStructure } from '../tournamentGenerator';
import { TEAM_COLORS } from '../tournamentConstants';

/**
 * Helper to create a mock global team
 */
function createMockTeam(id: string, label: string, groupId: string | null = null): GlobalTeam {
  return {
    id,
    label,
    color: null,
    groupId,
  };
}

/**
 * Helper to create a mock stage node
 */
function createMockStage(
  id: string,
  name: string,
  order: number,
  progressionMode: 'round_robin' | 'placement',
  parentId: string = 'field1'
): StageNode {
  return {
    id,
    type: 'stage',
    position: { x: 0, y: 0 },
    data: {
      name,
      order,
      progressionMode,
      progressionConfig: progressionMode === 'placement' ? { mode: 'placement', positions: 4, format: 'single_elimination' } : null,
    },
    parentId,
  };
}

/**
 * Helper to create a mock game node
 */
function createMockGame(id: string, standing: string, parentId: string): GameNode {
  return {
    id,
    type: 'game',
    position: { x: 0, y: 0 },
    data: {
      standing,
      homeTeamId: null,
      awayTeamId: null,
      startTime: null,
      manualStartTime: false,
      breakAfter: null,
      homeScore: null,
      awayScore: null,
    },
    parentId,
  };
}

describe('teamAssignment', () => {
  describe('getTeamColor', () => {
    it('should return first color for index 0', () => {
      expect(getTeamColor(0)).toBe(TEAM_COLORS[0]);
      expect(getTeamColor(0)).toBe('#3498db'); // Blue
    });

    it('should return correct colors for sequential indices', () => {
      expect(getTeamColor(1)).toBe('#e74c3c'); // Red
      expect(getTeamColor(2)).toBe('#2ecc71'); // Green
      expect(getTeamColor(3)).toBe('#f39c12'); // Orange
    });

    it('should wrap around after 12 colors', () => {
      expect(getTeamColor(12)).toBe(TEAM_COLORS[0]);
      expect(getTeamColor(13)).toBe(TEAM_COLORS[1]);
      expect(getTeamColor(24)).toBe(TEAM_COLORS[0]);
    });

    it('should handle large indices', () => {
      const largeIndex = 100;
      const expectedColor = TEAM_COLORS[largeIndex % TEAM_COLORS.length];
      expect(getTeamColor(largeIndex)).toBe(expectedColor);
    });

    it('should return hex color format', () => {
      const color = getTeamColor(0);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('generateTeamsForTournament', () => {
    it('should generate correct number of teams', () => {
      const teams = generateTeamsForTournament(4);
      expect(teams).toHaveLength(4);
    });

    it('should generate teams with sequential labels starting from 1', () => {
      const teams = generateTeamsForTournament(3);
      expect(teams[0].label).toBe('Team 1');
      expect(teams[1].label).toBe('Team 2');
      expect(teams[2].label).toBe('Team 3');
    });

    it('should generate teams with offset labels', () => {
      const teams = generateTeamsForTournament(3, 5);
      expect(teams[0].label).toBe('Team 6');
      expect(teams[1].label).toBe('Team 7');
      expect(teams[2].label).toBe('Team 8');
    });

    it('should assign colors from palette', () => {
      const teams = generateTeamsForTournament(4);
      expect(teams[0].color).toBe('#3498db'); // Blue
      expect(teams[1].color).toBe('#e74c3c'); // Red
      expect(teams[2].color).toBe('#2ecc71'); // Green
      expect(teams[3].color).toBe('#f39c12'); // Orange
    });

    it('should handle zero teams', () => {
      const teams = generateTeamsForTournament(0);
      expect(teams).toHaveLength(0);
    });

    it('should handle large team counts', () => {
      const teams = generateTeamsForTournament(20);
      expect(teams).toHaveLength(20);
      expect(teams[0].label).toBe('Team 1');
      expect(teams[19].label).toBe('Team 20');
      // Colors should wrap
      expect(teams[12].color).toBe(TEAM_COLORS[0]);
    });

    it('should generate team objects with correct structure', () => {
      const teams = generateTeamsForTournament(1);
      expect(teams[0]).toHaveProperty('label');
      expect(teams[0]).toHaveProperty('color');
      expect(typeof teams[0].label).toBe('string');
      expect(typeof teams[0].color).toBe('string');
    });
  });

  describe('assignTeamsToTournamentGames', () => {
    describe('Round Robin Stages', () => {
      it('should assign teams to games in round robin pattern', () => {
        const teams: GlobalTeam[] = [
          createMockTeam('t1', 'Team 1'),
          createMockTeam('t2', 'Team 2'),
          createMockTeam('t3', 'Team 3'),
          createMockTeam('t4', 'Team 4'),
        ];

        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [
          createMockGame('g1', 'G1', 'stage1'),
          createMockGame('g2', 'G2', 'stage1'),
        ];

        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        // Should create 4 assign_team operations (2 games × 2 teams)
        const assignOps = operations.filter((op) => op.type === 'assign_team');
        expect(assignOps).toHaveLength(4);

        // Game 1: Team 1 vs Team 2
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g1' && op.teamId === 't1' && op.slot === 'home')).toBeDefined();
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g1' && op.teamId === 't2' && op.slot === 'away')).toBeDefined();

        // Game 2: Team 3 vs Team 4
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g2' && op.teamId === 't3' && op.slot === 'home')).toBeDefined();
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g2' && op.teamId === 't4' && op.slot === 'away')).toBeDefined();
      });

      it('should wrap around teams in round robin', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1'), createMockTeam('t2', 'Team 2')];

        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [
          createMockGame('g1', 'G1', 'stage1'),
          createMockGame('g2', 'G2', 'stage1'),
        ];

        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        const assignOps = operations.filter((op) => op.type === 'assign_team');
        // Should create 4 operations: both games get Team 1 vs Team 2 (wraps around)
        expect(assignOps).toHaveLength(4);

        // Game 1: Team 1 vs Team 2
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g1' && op.teamId === 't1')).toBeDefined();
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g1' && op.teamId === 't2')).toBeDefined();

        // Game 2: Team 1 vs Team 2 (wrapped around)
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g2' && op.teamId === 't1')).toBeDefined();
        expect(assignOps.find((op) => op.type === 'assign_team' && op.gameId === 'g2' && op.teamId === 't2')).toBeDefined();
      });

      it('should split teams across parallel stages', () => {
        const teams: GlobalTeam[] = [
          createMockTeam('t1', 'Team 1'),
          createMockTeam('t2', 'Team 2'),
          createMockTeam('t3', 'Team 3'),
          createMockTeam('t4', 'Team 4'),
        ];

        // Two stages at same order (split field)
        const stage1 = createMockStage('stage1', 'Group A', 0, 'round_robin');
        const stage2 = createMockStage('stage2', 'Group B', 0, 'round_robin');
        const games: GameNode[] = [
          createMockGame('g1', 'G1', 'stage1'),
          createMockGame('g2', 'G2', 'stage2'),
        ];

        const structure: TournamentStructure = {
          stages: [stage1, stage2],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        const assignOps = operations.filter((op) => op.type === 'assign_team');

        // Group A gets first 2 teams
        const groupAOps = assignOps.filter((op) => op.type === 'assign_team' && op.gameId === 'g1');
        expect(groupAOps.some((op) => op.type === 'assign_team' && op.teamId === 't1')).toBe(true);
        expect(groupAOps.some((op) => op.type === 'assign_team' && op.teamId === 't2')).toBe(true);

        // Group B gets next 2 teams
        const groupBOps = assignOps.filter((op) => op.type === 'assign_team' && op.gameId === 'g2');
        expect(groupBOps.some((op) => op.type === 'assign_team' && op.teamId === 't3')).toBe(true);
        expect(groupBOps.some((op) => op.type === 'assign_team' && op.teamId === 't4')).toBe(true);
      });
    });

    describe('Placement Stages', () => {
      it('should create edge operations for placement stages', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1'), createMockTeam('t2', 'Team 2')];

        const stage = createMockStage('stage1', 'Playoffs', 0, 'placement');
        const games: GameNode[] = [
          createMockGame('sf1', 'SF1', 'stage1'),
          createMockGame('sf2', 'SF2', 'stage1'),
          createMockGame('final', 'Final', 'stage1'),
          createMockGame('third', '3rd Place', 'stage1'),
        ];

        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        // Should create 1 add_edges operation
        const edgeOps = operations.filter((op) => op.type === 'add_edges');
        expect(edgeOps).toHaveLength(1);

        // Should have edges from bracket edge generator
        const edges = edgeOps[0].type === 'add_edges' ? edgeOps[0].edges : [];
        expect(edges.length).toBeGreaterThan(0);
      });

      it('should not create team assignments for placement stages', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1'), createMockTeam('t2', 'Team 2')];

        const stage = createMockStage('stage1', 'Playoffs', 0, 'placement');
        const games: GameNode[] = [createMockGame('final', 'Final', 'stage1')];

        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        // Should not have any assign_team operations
        const assignOps = operations.filter((op) => op.type === 'assign_team');
        expect(assignOps).toHaveLength(0);
      });
    });

    describe('Multi-Stage Tournaments', () => {
      it('should process stages in order', () => {
        const teams: GlobalTeam[] = [
          createMockTeam('t1', 'Team 1'),
          createMockTeam('t2', 'Team 2'),
          createMockTeam('t3', 'Team 3'),
          createMockTeam('t4', 'Team 4'),
        ];

        const groupStage = createMockStage('stage1', 'Groups', 0, 'round_robin');

        // Create custom placement stage with positions: 2 for final bracket
        const playoffStage: StageNode = {
          id: 'stage2',
          type: 'stage',
          position: { x: 0, y: 0 },
          data: {
            name: 'Playoffs',
            order: 1,
            progressionMode: 'placement',
            progressionConfig: {
              mode: 'placement',
              positions: 2, // 2-position bracket (just final)
              format: 'single_elimination',
            },
          },
          parentId: 'field1',
        };

        const games: GameNode[] = [
          createMockGame('g1', 'G1', 'stage1'),
          createMockGame('g2', 'G2', 'stage1'), // Need 2 source games for final
          createMockGame('final', 'Final', 'stage2'),
        ];

        const structure: TournamentStructure = {
          stages: [playoffStage, groupStage], // Note: unsorted
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        // Should process group stage first (order 0), then playoffs (order 1)
        expect(operations[0].type).toBe('assign_team'); // From group stage
        const lastOp = operations[operations.length - 1];
        expect(lastOp.type).toBe('add_edges'); // From playoff stage
      });

      it('should track previous games for placement stages', () => {
        const teams: GlobalTeam[] = [
          createMockTeam('t1', 'Team 1'),
          createMockTeam('t2', 'Team 2'),
          createMockTeam('t3', 'Team 3'),
          createMockTeam('t4', 'Team 4'),
        ];

        const groupStage = createMockStage('stage1', 'Groups', 0, 'round_robin');
        const playoffStage = createMockStage('stage2', 'Playoffs', 1, 'placement');

        const games: GameNode[] = [
          createMockGame('g1', 'G1', 'stage1'),
          createMockGame('g2', 'G2', 'stage1'),
          createMockGame('sf1', 'SF1', 'stage2'),
          createMockGame('sf2', 'SF2', 'stage2'),
        ];

        const structure: TournamentStructure = {
          stages: [groupStage, playoffStage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);

        // Should have team assignments for group stage
        const assignOps = operations.filter((op) => op.type === 'assign_team');
        expect(assignOps.length).toBeGreaterThan(0);

        // Should have edges for playoff stage using group games as source
        const edgeOps = operations.filter((op) => op.type === 'add_edges');
        expect(edgeOps.length).toBeGreaterThan(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty structure', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1')];
        const structure: TournamentStructure = {
          stages: [],
          games: [],
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        expect(operations).toHaveLength(0);
      });

      it('should handle empty teams array', () => {
        const teams: GlobalTeam[] = [];
        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [createMockGame('g1', 'G1', 'stage1')];
        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        expect(operations).toHaveLength(0);
      });

      it('should handle stage with no games', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1')];
        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const structure: TournamentStructure = {
          stages: [stage],
          games: [], // No games
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        expect(operations).toHaveLength(0);
      });

      it('should handle single team (cannot assign pairs)', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1')];
        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [createMockGame('g1', 'G1', 'stage1')];
        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        // Cannot create pairs with only 1 team
        expect(operations).toHaveLength(0);
      });
    });

    describe('Operation Structure', () => {
      it('should return operations array', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1'), createMockTeam('t2', 'Team 2')];
        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [createMockGame('g1', 'G1', 'stage1')];
        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        expect(Array.isArray(operations)).toBe(true);
      });

      it('should have correct assign_team operation structure', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1'), createMockTeam('t2', 'Team 2')];
        const stage = createMockStage('stage1', 'Group Stage', 0, 'round_robin');
        const games: GameNode[] = [createMockGame('g1', 'G1', 'stage1')];
        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        const assignOp = operations[0];

        expect(assignOp.type).toBe('assign_team');
        if (assignOp.type === 'assign_team') {
          expect(assignOp).toHaveProperty('gameId');
          expect(assignOp).toHaveProperty('teamId');
          expect(assignOp).toHaveProperty('slot');
          expect(['home', 'away']).toContain(assignOp.slot);
        }
      });

      it('should have correct add_edges operation structure', () => {
        const teams: GlobalTeam[] = [createMockTeam('t1', 'Team 1')];
        const stage = createMockStage('stage1', 'Playoffs', 0, 'placement');
        const games: GameNode[] = [
          createMockGame('sf1', 'SF1', 'stage1'),
          createMockGame('sf2', 'SF2', 'stage1'),
          createMockGame('final', 'Final', 'stage1'),
          createMockGame('third', '3rd Place', 'stage1'),
        ];
        const structure: TournamentStructure = {
          stages: [stage],
          games,
          edges: [],
        };

        const operations = assignTeamsToTournamentGames(structure, teams);
        const edgeOp = operations[0];

        expect(edgeOp.type).toBe('add_edges');
        if (edgeOp.type === 'add_edges') {
          expect(edgeOp).toHaveProperty('edges');
          expect(Array.isArray(edgeOp.edges)).toBe(true);
        }
      });
    });
  });
});
