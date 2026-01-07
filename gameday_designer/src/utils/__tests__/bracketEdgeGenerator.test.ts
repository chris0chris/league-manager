/**
 * Tests for bracket edge generator
 *
 * Comprehensive tests for tournament bracket edge creation logic.
 * Tests single elimination and crossover formats with 2, 4, and 8 team brackets.
 */

import { describe, it, expect } from 'vitest';
import { createPlacementEdges, type EdgeSpec } from '../bracketEdgeGenerator';
import type { GameNode, StageNodeData } from '../../types/flowchart';

/**
 * Helper to create a mock game node
 */
function createMockGame(id: string, standing: string, parentId: string = 'stage1'): GameNode {
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

/**
 * Helper to find edges by target game and slot
 */
function findEdge(edges: EdgeSpec[], targetId: string, slot: 'home' | 'away'): EdgeSpec | undefined {
  return edges.find((e) => e.targetGameId === targetId && e.targetSlot === slot);
}

describe('bracketEdgeGenerator', () => {
  describe('createPlacementEdges - Invalid/Empty Config', () => {
    it('should return empty array for null config', () => {
      const targetGames: GameNode[] = [];
      const sourceGames: GameNode[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = createPlacementEdges(targetGames, sourceGames, null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined config', () => {
      const targetGames: GameNode[] = [];
      const sourceGames: GameNode[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = createPlacementEdges(targetGames, sourceGames, undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for non-placement mode', () => {
      const targetGames: GameNode[] = [];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'none',
      };
      const result = createPlacementEdges(targetGames, sourceGames, config);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty target games', () => {
      const targetGames: GameNode[] = [];
      const sourceGames: GameNode[] = [createMockGame('source1', 'G1')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };
      const result = createPlacementEdges(targetGames, sourceGames, config);
      expect(result).toEqual([]);
    });
  });

  describe('4-Team Single Elimination - All Games in Target', () => {
    it('should create internal bracket edges when all 4 games are in target', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 4 internal edges: SF winners → Final, SF losers → 3rd Place
      expect(result).toHaveLength(4);

      // SF1 winner → Final home
      const sf1WinnerEdge = findEdge(result, 'final', 'home');
      expect(sf1WinnerEdge).toBeDefined();
      expect(sf1WinnerEdge?.sourceGameId).toBe('sf1');
      expect(sf1WinnerEdge?.outputType).toBe('winner');

      // SF2 winner → Final away
      const sf2WinnerEdge = findEdge(result, 'final', 'away');
      expect(sf2WinnerEdge).toBeDefined();
      expect(sf2WinnerEdge?.sourceGameId).toBe('sf2');
      expect(sf2WinnerEdge?.outputType).toBe('winner');

      // SF1 loser → 3rd Place home
      const sf1LoserEdge = findEdge(result, 'third', 'home');
      expect(sf1LoserEdge).toBeDefined();
      expect(sf1LoserEdge?.sourceGameId).toBe('sf1');
      expect(sf1LoserEdge?.outputType).toBe('loser');

      // SF2 loser → 3rd Place away
      const sf2LoserEdge = findEdge(result, 'third', 'away');
      expect(sf2LoserEdge).toBeDefined();
      expect(sf2LoserEdge?.sourceGameId).toBe('sf2');
      expect(sf2LoserEdge?.outputType).toBe('loser');
    });

    it('should create edges for split groups (6+ source games)', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [
        createMockGame('g1', 'G1'), // Group A first (index 0)
        createMockGame('g2', 'G2'), // Group A second (index 1)
        createMockGame('g3', 'G3'), // Group A third (index 2)
        createMockGame('g4', 'G4'), // Group B first (index 3)
        createMockGame('g5', 'G5'), // Group B fourth (index 4)
        createMockGame('g6', 'G6'), // Group B third (index 5)
      ];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 8 edges: 4 from group games to SFs + 4 internal SF edges
      expect(result).toHaveLength(8);

      // Group A first (g1) winner → SF1 home
      expect(result.find((e) => e.sourceGameId === 'g1' && e.targetGameId === 'sf1')).toBeDefined();
      // Group B first (g4) winner → SF1 away
      expect(result.find((e) => e.sourceGameId === 'g4' && e.targetGameId === 'sf1')).toBeDefined();
      // Group A third (g3) winner → SF2 home
      expect(result.find((e) => e.sourceGameId === 'g3' && e.targetGameId === 'sf2')).toBeDefined();
      // Group B third (g6) winner → SF2 away
      expect(result.find((e) => e.sourceGameId === 'g6' && e.targetGameId === 'sf2')).toBeDefined();
    });

    it('should create edges for single group (3 source games)', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [
        createMockGame('g1', 'G1'),
        createMockGame('g2', 'G2'),
        createMockGame('g3', 'G3'),
      ];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 8 edges: 4 from group games to SFs + 4 internal SF edges
      expect(result).toHaveLength(8);

      // g1 winner → SF1 home
      expect(result.find((e) => e.sourceGameId === 'g1' && e.targetGameId === 'sf1' && e.outputType === 'winner')).toBeDefined();
      // g2 winner → SF1 away
      expect(result.find((e) => e.sourceGameId === 'g2' && e.targetGameId === 'sf1' && e.outputType === 'winner')).toBeDefined();
      // g3 winner → SF2 home
      expect(result.find((e) => e.sourceGameId === 'g3' && e.targetGameId === 'sf2' && e.outputType === 'winner')).toBeDefined();
      // g1 loser → SF2 away (for 3 games, reuse first game loser)
      expect(result.find((e) => e.sourceGameId === 'g1' && e.targetGameId === 'sf2' && e.outputType === 'loser')).toBeDefined();
    });

    it('should create edges for single group (4 source games)', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [
        createMockGame('g1', 'G1'),
        createMockGame('g2', 'G2'),
        createMockGame('g3', 'G3'),
        createMockGame('g4', 'G4'),
      ];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 8 edges: 4 from group games to SFs + 4 internal SF edges
      expect(result).toHaveLength(8);

      // g4 winner → SF2 away (for 4 games, use 4th game winner instead of loser)
      expect(result.find((e) => e.sourceGameId === 'g4' && e.targetGameId === 'sf2' && e.outputType === 'winner')).toBeDefined();
    });

    it('should create edges for 2-game pattern', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [createMockGame('g1', 'G1'), createMockGame('g2', 'G2')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 8 edges: 4 from 2 games (winners + losers) to SFs + 4 internal SF edges
      expect(result).toHaveLength(8);

      // g1 winner → SF1 home
      expect(result.find((e) => e.sourceGameId === 'g1' && e.targetGameId === 'sf1' && e.outputType === 'winner')).toBeDefined();
      // g2 winner → SF1 away
      expect(result.find((e) => e.sourceGameId === 'g2' && e.targetGameId === 'sf1' && e.outputType === 'winner')).toBeDefined();
      // g1 loser → SF2 home
      expect(result.find((e) => e.sourceGameId === 'g1' && e.targetGameId === 'sf2' && e.outputType === 'loser')).toBeDefined();
      // g2 loser → SF2 away
      expect(result.find((e) => e.sourceGameId === 'g2' && e.targetGameId === 'sf2' && e.outputType === 'loser')).toBeDefined();
    });
  });

  describe('4-Team Single Elimination - Games Split Across Stages', () => {
    it('should create edges from source to semifinals only', () => {
      const targetGames: GameNode[] = [createMockGame('sf1', 'SF1'), createMockGame('sf2', 'SF2')];
      const sourceGames: GameNode[] = [
        createMockGame('g1', 'G1'),
        createMockGame('g2', 'G2'),
        createMockGame('g3', 'G3'),
        createMockGame('g4', 'G4'),
        createMockGame('g5', 'G5'),
        createMockGame('g6', 'G6'),
      ];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 4 edges: split group pattern to SFs (no final/3rd place in target)
      expect(result).toHaveLength(4);

      // Verify edges go to SF1 and SF2 only
      const sf1Edges = result.filter((e) => e.targetGameId === 'sf1');
      const sf2Edges = result.filter((e) => e.targetGameId === 'sf2');
      expect(sf1Edges).toHaveLength(2);
      expect(sf2Edges).toHaveLength(2);
    });

    it('should create edges from source SFs to target Final/3rd Place', () => {
      const targetGames: GameNode[] = [createMockGame('final', 'Final'), createMockGame('third', '3rd Place')];
      const sourceGames: GameNode[] = [createMockGame('sf1', 'SF1'), createMockGame('sf2', 'SF2')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 4 edges: SF winners → Final, SF losers → 3rd Place
      expect(result).toHaveLength(4);

      // SF1 winner → Final home
      expect(result.find((e) => e.sourceGameId === 'sf1' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();
      // SF2 winner → Final away
      expect(result.find((e) => e.sourceGameId === 'sf2' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();
      // SF1 loser → 3rd Place home
      expect(result.find((e) => e.sourceGameId === 'sf1' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
      // SF2 loser → 3rd Place away
      expect(result.find((e) => e.sourceGameId === 'sf2' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
    });
  });

  describe('2-Team Bracket (Final Only)', () => {
    it('should create edges from 2 source games to final', () => {
      const targetGames: GameNode[] = [createMockGame('final', 'Final')];
      const sourceGames: GameNode[] = [createMockGame('sf1', 'SF1'), createMockGame('sf2', 'SF2')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 2,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 2 edges: last 2 games (SF1, SF2) → Final
      expect(result).toHaveLength(2);

      // Second-to-last (SF1) winner → Final home
      const sf1Edge = findEdge(result, 'final', 'home');
      expect(sf1Edge).toBeDefined();
      expect(sf1Edge?.sourceGameId).toBe('sf1');
      expect(sf1Edge?.outputType).toBe('winner');

      // Last (SF2) winner → Final away
      const sf2Edge = findEdge(result, 'final', 'away');
      expect(sf2Edge).toBeDefined();
      expect(sf2Edge?.sourceGameId).toBe('sf2');
      expect(sf2Edge?.outputType).toBe('winner');
    });

    it('should return empty array if less than 2 source games', () => {
      const targetGames: GameNode[] = [createMockGame('final', 'Final')];
      const sourceGames: GameNode[] = [createMockGame('sf1', 'SF1')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 2,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);
      expect(result).toEqual([]);
    });

    it('should return empty array if no final game in target', () => {
      const targetGames: GameNode[] = [createMockGame('sf1', 'SF1')];
      const sourceGames: GameNode[] = [createMockGame('g1', 'G1'), createMockGame('g2', 'G2')];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 2,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);
      expect(result).toEqual([]);
    });
  });

  describe('8-Team Single Elimination', () => {
    it('should create complete 8-team bracket edges', () => {
      const targetGames: GameNode[] = [
        createMockGame('qf1', 'QF1'),
        createMockGame('qf2', 'QF2'),
        createMockGame('qf3', 'QF3'),
        createMockGame('qf4', 'QF4'),
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 8,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 8 edges: QF → SF (4), SF → Final (2), SF → 3rd Place (2)
      expect(result).toHaveLength(8);

      // QF1, QF2 → SF1
      expect(result.find((e) => e.sourceGameId === 'qf1' && e.targetGameId === 'sf1')).toBeDefined();
      expect(result.find((e) => e.sourceGameId === 'qf2' && e.targetGameId === 'sf1')).toBeDefined();

      // QF3, QF4 → SF2
      expect(result.find((e) => e.sourceGameId === 'qf3' && e.targetGameId === 'sf2')).toBeDefined();
      expect(result.find((e) => e.sourceGameId === 'qf4' && e.targetGameId === 'sf2')).toBeDefined();

      // SF1, SF2 winners → Final
      expect(result.find((e) => e.sourceGameId === 'sf1' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();
      expect(result.find((e) => e.sourceGameId === 'sf2' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();

      // SF1, SF2 losers → 3rd Place
      expect(result.find((e) => e.sourceGameId === 'sf1' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
      expect(result.find((e) => e.sourceGameId === 'sf2' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
    });

    it('should handle partial 8-team bracket (only QFs and SFs)', () => {
      const targetGames: GameNode[] = [
        createMockGame('qf1', 'QF1'),
        createMockGame('qf2', 'QF2'),
        createMockGame('qf3', 'QF3'),
        createMockGame('qf4', 'QF4'),
        createMockGame('sf1', 'SF1'),
        createMockGame('sf2', 'SF2'),
      ];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 8,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 4 edges: QF → SF only (no Final/3rd Place)
      expect(result).toHaveLength(4);
    });
  });

  describe('4-Team Crossover Format', () => {
    it('should create crossover bracket edges', () => {
      const targetGames: GameNode[] = [
        createMockGame('co1', 'CO1'),
        createMockGame('co2', 'CO2'),
        createMockGame('final', 'Final'),
        createMockGame('third', '3rd Place'),
      ];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'crossover',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should create 4 edges: CO winners → Final, CO losers → 3rd Place
      expect(result).toHaveLength(4);

      // CO1 winner → Final home
      expect(result.find((e) => e.sourceGameId === 'co1' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();
      // CO2 winner → Final away
      expect(result.find((e) => e.sourceGameId === 'co2' && e.targetGameId === 'final' && e.outputType === 'winner')).toBeDefined();
      // CO1 loser → 3rd Place home
      expect(result.find((e) => e.sourceGameId === 'co1' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
      // CO2 loser → 3rd Place away
      expect(result.find((e) => e.sourceGameId === 'co2' && e.targetGameId === 'third' && e.outputType === 'loser')).toBeDefined();
    });

    it('should return empty array if crossover games missing', () => {
      const targetGames: GameNode[] = [createMockGame('final', 'Final'), createMockGame('third', '3rd Place')];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'crossover',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing games gracefully', () => {
      const targetGames: GameNode[] = [
        createMockGame('sf1', 'SF1'),
        // SF2 missing
        createMockGame('final', 'Final'),
      ];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        positions: 4,
        format: 'single_elimination',
      };

      const result = createPlacementEdges(targetGames, sourceGames, config);

      // Should handle gracefully, only create edges for existing games
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid bracket configuration without crashing', () => {
      const targetGames: GameNode[] = [createMockGame('invalid', 'Invalid')];
      const sourceGames: GameNode[] = [];
      const config: StageNodeData['progressionConfig'] = {
        mode: 'placement',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        positions: 99 as any, // Invalid positions
        format: 'single_elimination',
      };

      expect(() => {
        const result = createPlacementEdges(targetGames, sourceGames, config);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});
