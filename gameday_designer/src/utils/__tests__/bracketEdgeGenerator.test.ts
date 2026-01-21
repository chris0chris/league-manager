import { describe, it, expect, vi } from 'vitest';
import { createPlacementEdges } from '../bracketEdgeGenerator';
import type { GameNode } from '../../types/flowchart';
import {
  GAME_STANDING_SF1,
  GAME_STANDING_SF2,
  GAME_STANDING_FINAL,
  GAME_STANDING_THIRD_PLACE,
  GAME_STANDING_QF1,
  GAME_STANDING_QF2,
  GAME_STANDING_QF3,
  GAME_STANDING_QF4,
  GAME_STANDING_CO1,
  GAME_STANDING_CO2,
} from '../tournamentConstants';

describe('bracketEdgeGenerator', () => {
  // Helper to create mock game nodes
  const createMockGame = (id: string, standing: string): GameNode => ({
    id,
    type: 'game',
    position: { x: 0, y: 0 },
    data: {
      standing,
      homeTeamId: null,
      awayTeamId: null,
      officialTeamId: null,
      startTime: '10:00',
      duration: 70,
    },
  });

  describe('createPlacementEdges - 4-Team Single Elimination', () => {
    const targetGames = [
      createMockGame('sf1', GAME_STANDING_SF1),
      createMockGame('sf2', GAME_STANDING_SF2),
      createMockGame('final', GAME_STANDING_FINAL),
      createMockGame('third', GAME_STANDING_THIRD_PLACE),
    ];

    it('should create edges for 2-group split group pattern (6 games)', () => {
      const sourceGames = [
        createMockGame('g1', 'Group A1'),
        createMockGame('g2', 'Group A2'),
        createMockGame('g3', 'Group A3'),
        createMockGame('g4', 'Group B1'),
        createMockGame('g5', 'Group B2'),
        createMockGame('g6', 'Group B3'),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config);

      // 4 source-to-SF edges + 4 SF-to-Final/3rd edges = 8 edges
      expect(edges).toHaveLength(8);

      // Verify source to SF1 (Group A1 vs Group B1)
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g1',
        outputType: 'winner',
        targetGameId: 'sf1',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g4',
        outputType: 'winner',
        targetGameId: 'sf1',
        targetSlot: 'away'
      }));

      // Verify source to SF2 (Group A3 vs Group B3)
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g3',
        outputType: 'winner',
        targetGameId: 'sf2',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g6',
        outputType: 'winner',
        targetGameId: 'sf2',
        targetSlot: 'away'
      }));

      // Verify internal bracket edges
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf1',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf2',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'away'
      }));
    });

    it('should create edges for single group pattern (3 games)', () => {
      const sourceGames = [
        createMockGame('g1', 'Game 1'),
        createMockGame('g2', 'Game 2'),
        createMockGame('g3', 'Game 3'),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config);

      // 4 source-to-SF edges + 4 SF-to-Final/3rd edges = 8 edges
      expect(edges).toHaveLength(8);

      // For 3 games: G1 winner, G2 winner -> SF1; G3 winner, G1 loser -> SF2
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g1',
        outputType: 'winner',
        targetGameId: 'sf1',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g2',
        outputType: 'winner',
        targetGameId: 'sf1',
        targetSlot: 'away'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g3',
        outputType: 'winner',
        targetGameId: 'sf2',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g1',
        outputType: 'loser',
        targetGameId: 'sf2',
        targetSlot: 'away'
      }));
    });

    it('should create edges for simple 2-game pattern', () => {
      const sourceGames = [
        createMockGame('g1', 'Game 1'),
        createMockGame('g2', 'Game 2'),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config);

      // SF1: G1 winner vs G2 winner; SF2: G1 loser vs G2 loser
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g1',
        outputType: 'winner',
        targetGameId: 'sf1',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'g1',
        outputType: 'loser',
        targetGameId: 'sf2',
        targetSlot: 'home'
      }));
    });
  });

  describe('createPlacementEdges - 2-Team Final Only', () => {
    it('should connect semifinal winners to final', () => {
      const targetGames = [createMockGame('final', GAME_STANDING_FINAL)];
      const sourceGames = [
        createMockGame('sf1', GAME_STANDING_SF1),
        createMockGame('sf2', GAME_STANDING_SF2),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 2,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config);

      expect(edges).toHaveLength(2);
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf1',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf2',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'away'
      }));
    });
  });

  describe('createPlacementEdges - 8-Team Single Elimination', () => {
    it('should create internal edges for full 8-team bracket', () => {
      const targetGames = [
        createMockGame('qf1', GAME_STANDING_QF1),
        createMockGame('qf2', GAME_STANDING_QF2),
        createMockGame('qf3', GAME_STANDING_QF3),
        createMockGame('qf4', GAME_STANDING_QF4),
        createMockGame('sf1', GAME_STANDING_SF1),
        createMockGame('sf2', GAME_STANDING_SF2),
        createMockGame('final', GAME_STANDING_FINAL),
        createMockGame('third', GAME_STANDING_THIRD_PLACE),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 8,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, [], config);

      // QF->SF (4 edges) + SF->Final/3rd (4 edges) = 8 edges
      expect(edges).toHaveLength(8);

      // QF1/2 to SF1
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'qf1',
        targetGameId: 'sf1',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'qf2',
        targetGameId: 'sf1',
        targetSlot: 'away'
      }));

      // SF1/2 to Final
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf1',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'home'
      }));
    });
  });

  describe('createPlacementEdges - 4-Team Crossover', () => {
    it('should connect crossover winners/losers to final/3rd place', () => {
      const targetGames = [
        createMockGame('co1', GAME_STANDING_CO1),
        createMockGame('co2', GAME_STANDING_CO2),
        createMockGame('final', GAME_STANDING_FINAL),
        createMockGame('third', GAME_STANDING_THIRD_PLACE),
      ];

      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'crossover' as const,
      };

      const edges = createPlacementEdges(targetGames, [], config);

      expect(edges).toHaveLength(4);
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'co1',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'home'
      }));
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'co2',
        outputType: 'loser',
        targetGameId: 'third',
        targetSlot: 'away'
      }));
    });
  });

  describe('createPlacementEdges - Custom Mapping', () => {
    it('should create edges from progressionMapping', () => {
      const targetGames = [createMockGame('final', 'Final')];
      const sourceGames = [createMockGame('sf1', 'SF1'), createMockGame('sf2', 'SF2')];
      
      const mapping = {
        'Final': {
          home: { type: 'winner', sourceIndex: 0 },
          away: { type: 'winner', sourceIndex: 1 }
        }
      };

      const config = {
        mode: 'placement' as const,
        positions: 2,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config, mapping);
      
      expect(edges).toContainEqual(expect.objectContaining({
        sourceGameId: 'sf1',
        outputType: 'winner',
        targetGameId: 'final',
        targetSlot: 'home'
      }));
    });

    it('should handle rank-based mapping', () => {
      const targetGames = [createMockGame('sf1', 'SF1')];
      const sourceGames = [createMockGame('g1', 'G1')]; // Need at least one source game to trigger mapping logic
      const mapping = {
        'SF1': {
          home: { type: 'rank', sourceStageId: 'stage1', sourceIndex: 0 },
          away: { type: 'rank', sourceStageId: 'stage1', sourceIndex: 1 }
        }
      };

      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'single_elimination' as const,
      };

      const edges = createPlacementEdges(targetGames, sourceGames, config, mapping);
      
      expect(edges).toContainEqual(expect.objectContaining({
        sourceStageId: 'stage1',
        sourceRank: 1,
        outputType: 'rank',
        targetGameId: 'sf1',
        targetSlot: 'home'
      }));
    });

    it('should skip mapping if target game is not found', () => {
      const targetGames = [createMockGame('final', 'Final')];
      const sourceGames = [createMockGame('g1', 'G1')];
      const mapping = {
        'NonExistent': {
          home: { type: 'winner', sourceIndex: 0 },
          away: { type: 'winner', sourceIndex: 0 }
        }
      };
      const config = { mode: 'placement' as const, positions: 2, format: 'single_elimination' as const };
      
      const edges = createPlacementEdges(targetGames, sourceGames, config, mapping);
      expect(edges).toEqual([]);
    });
  });

  describe('createPlacementEdges - Error Resilience', () => {
    it('should return empty array for non-placement mode', () => {
      const config = { mode: 'round_robin' as const };
      // @ts-expect-error testing invalid config
      const edges = createPlacementEdges([], [], config);
      expect(edges).toEqual([]);
    });

    it('should handle missing target games gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const config = {
        mode: 'placement' as const,
        positions: 4,
        format: 'single_elimination' as const,
      };

      // Empty target games, should not crash
      const edges = createPlacementEdges([], [createMockGame('g1', 'G1')], config);
      expect(edges).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle invalid format configurations', () => {
      const config = {
        mode: 'placement' as const,
        positions: 99, // Invalid position count
        format: 'single_elimination' as const,
      };
      
      const edges = createPlacementEdges([createMockGame('g1', 'G1')], [], config);
      expect(edges).toEqual([]);
    });

    it('should catch and log errors in createPlacementEdges', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by passing something that will throw when accessed
      // @ts-expect-error deliberate error injection
      const edges = createPlacementEdges(null, null, { mode: 'placement', positions: 4, format: 'single_elimination' });
      
      expect(edges).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});