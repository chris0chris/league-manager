/**
 * Unit tests for game generation utilities.
 * Tests round robin and placement game generation algorithms.
 */

import { describe, it, expect } from 'vitest';
import { generateRoundRobinGames, generatePlacementGames } from '../gameGenerators';
import type { RoundRobinConfig, PlacementConfig } from '../../types/flowchart';

describe('gameGenerators', () => {
  describe('generateRoundRobinGames', () => {
    it('should generate correct number of games for 4 teams single round', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 4,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      // N * (N - 1) / 2 = 4 * 3 / 2 = 6 games
      expect(games).toHaveLength(6);
    });

    it('should generate correct number of games for 4 teams double round', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 4,
        doubleRound: true,
      };

      const games = generateRoundRobinGames(stageId, config);

      // N * (N - 1) = 4 * 3 = 12 games
      expect(games).toHaveLength(12);
    });

    it('should generate correct number of games for 6 teams single round', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 6,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      // N * (N - 1) / 2 = 6 * 5 / 2 = 15 games
      expect(games).toHaveLength(15);
    });

    it('should generate games with correct structure', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 4,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      games.forEach((game, index) => {
        // Check node structure
        expect(game.type).toBe('game');
        expect(game.parentId).toBe(stageId);
        expect(game.id).toBeDefined();
        expect(game.position).toEqual({ x: 30, y: 50 });

        // Check data fields
        expect(game.data.type).toBe('game');
        expect(game.data.standing).toBe(`Game ${index + 1}`);
        expect(game.data.duration).toBe(50);
        expect(game.data.breakAfter).toBe(0);
        expect(game.data.manualTime).toBe(false);

        // Team assignments should be null (manual assignment)
        expect(game.data.homeTeamId).toBeNull();
        expect(game.data.awayTeamId).toBeNull();
        expect(game.data.homeTeamDynamic).toBeNull();
        expect(game.data.awayTeamDynamic).toBeNull();
      });
    });

    it('should generate unique IDs for each game', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 4,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);
      const ids = games.map(g => g.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(games.length);
    });

    it('should handle minimum team count (2 teams)', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 2,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      // 2 * 1 / 2 = 1 game
      expect(games).toHaveLength(1);
    });

    it('should handle odd number of teams (5 teams)', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 5,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      // 5 * 4 / 2 = 10 games
      expect(games).toHaveLength(10);
    });

    it('should use circular rotation algorithm for balanced scheduling', () => {
      const stageId = 'stage-1';
      const config: RoundRobinConfig = {
        mode: 'round_robin',
        teamCount: 4,
        doubleRound: false,
      };

      const games = generateRoundRobinGames(stageId, config);

      // With circular algorithm, all teams should play equal number of games
      // For 4 teams: each team plays 3 games
      expect(games).toHaveLength(6);
    });
  });

  describe('generatePlacementGames', () => {
    describe('single_elimination format', () => {
      it('should generate correct structure for 4 positions', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'single_elimination',
        };

        const games = generatePlacementGames(stageId, config);

        // For 4 positions: 2 semifinals + 1 final + 1 third-place = 4 games
        expect(games).toHaveLength(4);
      });

      it('should generate games with correct standing labels for 4 positions', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'single_elimination',
        };

        const games = generatePlacementGames(stageId, config);

        const standings = games.map(g => g.data.standing);
        expect(standings).toContain('SF1');
        expect(standings).toContain('SF2');
        expect(standings).toContain('Final');
        expect(standings).toContain('3rd Place');
      });

      it('should generate correct structure for 8 positions', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 8,
          format: 'single_elimination',
        };

        const games = generatePlacementGames(stageId, config);

        // For 8 positions: 4 QF + 2 SF + 1 Final + 1 3rd = 8 games
        expect(games).toHaveLength(8);
      });

      it('should generate games with correct structure', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'single_elimination',
        };

        const games = generatePlacementGames(stageId, config);

        games.forEach((game) => {
          expect(game.type).toBe('game');
          expect(game.parentId).toBe(stageId);
          expect(game.id).toBeDefined();
          expect(game.position).toEqual({ x: 30, y: 50 });
          expect(game.data.type).toBe('game');
          expect(game.data.duration).toBe(50);
          expect(game.data.breakAfter).toBe(0);
          expect(game.data.manualTime).toBe(false);

          // Team assignments should be null
          expect(game.data.homeTeamId).toBeNull();
          expect(game.data.awayTeamId).toBeNull();
        });
      });
    });

    describe('crossover format', () => {
      it('should generate correct structure for 4 positions', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'crossover',
        };

        const games = generatePlacementGames(stageId, config);

        // Crossover for 4: 2 crossover matches + 1 final + 1 third-place = 4 games
        expect(games).toHaveLength(4);
      });

      it('should generate games with correct standing labels for crossover', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'crossover',
        };

        const games = generatePlacementGames(stageId, config);

        const standings = games.map(g => g.data.standing);
        // Crossover: 1v4, 2v3, then finals
        expect(standings).toContain('CO1'); // Crossover 1 (1st vs 4th)
        expect(standings).toContain('CO2'); // Crossover 2 (2nd vs 3rd)
        expect(standings).toContain('Final');
        expect(standings).toContain('3rd Place');
      });

      it('should generate unique IDs for each game', () => {
        const stageId = 'stage-1';
        const config: PlacementConfig = {
          mode: 'placement',
          positions: 4,
          format: 'crossover',
        };

        const games = generatePlacementGames(stageId, config);
        const ids = games.map(g => g.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(games.length);
      });
    });

    it('should handle different position counts', () => {
      const stageId = 'stage-1';
      const config2: PlacementConfig = {
        mode: 'placement',
        positions: 2,
        format: 'single_elimination',
      };

      const games2 = generatePlacementGames(stageId, config2);
      // For 2 positions: just 1 final game
      expect(games2).toHaveLength(1);
      expect(games2[0].data.standing).toBe('Final');
    });
  });
});
