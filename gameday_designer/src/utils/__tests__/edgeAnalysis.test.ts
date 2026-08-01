import { describe, it, expect } from 'vitest';
import {
  findSourceGameForReference,
  findTargetGamesForSource,
  getDownstreamGameIds,
  getEligibleSourceGames,
  getGamePath,
  areGamesInSameStage,
  areGamesInSameField,
  getGamesInStage,
  getStagesInField,
} from '../edgeAnalysis';
import type {
  FlowNode,
  FlowEdge,
  GameNode,
  StageNode,
  FieldNode,
} from '../../types/flowchart';

/**
 * Test suite for edge analysis utilities.
 *
 * Tests functions for analyzing game-to-game connections and container hierarchies.
 */

describe('edgeAnalysis', () => {
  // Test data setup
  const createField = (id: string, name: string, order: number): FieldNode => ({
    id,
    type: 'field',
    data: {
      type: 'field',
      name,
      order,
    },
    position: { x: 0, y: 0 },
  });

  const createStage = (
    id: string,
    name: string,
    order: number,
    parentId: string
  ): StageNode => ({
    id,
    type: 'stage',
    data: {
      type: 'stage',
      name,
      order,
      category: 'preliminary',
      stageType: 'STANDARD',
    },
    position: { x: 0, y: 0 },
    parentId,
  });

  const createGame = (
    id: string,
    standing: string,
    parentId: string
  ): GameNode => ({
    id,
    type: 'game',
    data: {
      type: 'game',
      stage: 'Test Stage',
      stageType: 'STANDARD',
      standing,
      fieldId: null,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamDynamic: null,
      awayTeamDynamic: null,
      official: null,
      breakAfter: 0,
    },
    position: { x: 0, y: 0 },
    parentId,
  });

  const createEdge = (
    id: string,
    source: string,
    target: string,
    sourceHandle: 'winner' | 'loser',
    targetHandle: 'home' | 'away'
  ): FlowEdge => ({
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'gameToGame',
  } as FlowEdge);

  describe('findSourceGameForReference', () => {
    it('returns null when no edges exist', () => {
      const nodes: FlowNode[] = [createGame('game1', 'Match 1', 'stage1')];
      const edges: FlowEdge[] = [];

      const result = findSourceGameForReference('game1', 'home', edges, nodes);

      expect(result).toBeNull();
    });

    it('returns null when no edge targets the specified game and slot', () => {
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [game1, game2];
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'winner', 'away'),
      ];

      // Looking for home slot, but edge targets away slot
      const result = findSourceGameForReference('game2', 'home', edges, nodes);

      expect(result).toBeNull();
    });

    it('finds source game for winner -> home connection', () => {
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [game1, game2];
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'winner', 'home'),
      ];

      const result = findSourceGameForReference('game2', 'home', edges, nodes);

      expect(result).toEqual(game1);
    });

    it('finds source game for loser -> away connection', () => {
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [game1, game2];
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'loser', 'away'),
      ];

      const result = findSourceGameForReference('game2', 'away', edges, nodes);

      expect(result).toEqual(game1);
    });

    it('returns null when source node is not a game node', () => {
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [stage1, game2];
      const edges: FlowEdge[] = [
        // Invalid edge: stage -> game (should be game -> game)
        createEdge('edge1', 'stage1', 'game2', 'winner', 'home'),
      ];

      const result = findSourceGameForReference('game2', 'home', edges, nodes);

      expect(result).toBeNull();
    });

    it('returns null when source node does not exist', () => {
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [game2];
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'winner', 'home'),
      ];

      const result = findSourceGameForReference('game2', 'home', edges, nodes);

      expect(result).toBeNull();
    });

    it('handles multiple edges and finds the correct one', () => {
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const game3 = createGame('game3', 'Match 3', 'stage2');
      const nodes: FlowNode[] = [game1, game2, game3];
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game3', 'winner', 'home'),
        createEdge('edge2', 'game2', 'game3', 'winner', 'away'),
      ];

      const homeSource = findSourceGameForReference('game3', 'home', edges, nodes);
      const awaySource = findSourceGameForReference('game3', 'away', edges, nodes);

      expect(homeSource).toEqual(game1);
      expect(awaySource).toEqual(game2);
    });
  });

  describe('findTargetGamesForSource', () => {
    it('returns empty array when no edges exist', () => {
      const edges: FlowEdge[] = [];

      const result = findTargetGamesForSource('game1', edges);

      expect(result).toEqual([]);
    });

    it('returns empty array when source game has no outgoing edges', () => {
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game2', 'game3', 'winner', 'home'),
      ];

      const result = findTargetGamesForSource('game1', edges);

      expect(result).toEqual([]);
    });

    it('finds single target game', () => {
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'winner', 'home'),
      ];

      const result = findTargetGamesForSource('game1', edges);

      expect(result).toEqual([
        { gameId: 'game2', slot: 'home', outputType: 'winner' },
      ]);
    });

    it('finds multiple target games', () => {
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'game2', 'winner', 'home'),
        createEdge('edge2', 'game1', 'game3', 'loser', 'away'),
      ];

      const result = findTargetGamesForSource('game1', edges);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        gameId: 'game2',
        slot: 'home',
        outputType: 'winner',
      });
      expect(result).toContainEqual({
        gameId: 'game3',
        slot: 'away',
        outputType: 'loser',
      });
    });

    it('handles complex tournament bracket with multiple connections', () => {
      // Semi-final game1 winner -> final home, loser -> 3rd place home
      const edges: FlowEdge[] = [
        createEdge('edge1', 'game1', 'final', 'winner', 'home'),
        createEdge('edge2', 'game1', '3rd-place', 'loser', 'home'),
      ];

      const result = findTargetGamesForSource('game1', edges);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        gameId: 'final',
        slot: 'home',
        outputType: 'winner',
      });
      expect(result).toContainEqual({
        gameId: '3rd-place',
        slot: 'home',
        outputType: 'loser',
      });
    });
  });

  describe('getGamePath', () => {
    it('returns null when game does not exist', () => {
      const nodes: FlowNode[] = [];

      const result = getGamePath('game1', nodes);

      expect(result).toBeNull();
    });

    it('returns null when game has no parent stage', () => {
      const game = createGame('game1', 'Match 1', 'stage1');
      // Game references stage1 but stage1 doesn't exist
      const nodes: FlowNode[] = [game];

      const result = getGamePath('game1', nodes);

      expect(result).toBeNull();
    });

    it('returns null when stage has no parent field', () => {
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      // Stage references field1 but field1 doesn't exist
      const nodes: FlowNode[] = [stage, game];

      const result = getGamePath('game1', nodes);

      expect(result).toBeNull();
    });

    it('returns complete path when all hierarchy exists', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];

      const result = getGamePath('game1', nodes);

      expect(result).toEqual({
        field,
        stage,
        game,
      });
    });

    it('works with complex hierarchy across multiple fields', () => {
      const field1 = createField('field1', 'Feld 1', 0);
      const field2 = createField('field2', 'Feld 2', 1);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field2');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Final', 'stage2');
      const nodes: FlowNode[] = [field1, field2, stage1, stage2, game1, game2];

      const path1 = getGamePath('game1', nodes);
      const path2 = getGamePath('game2', nodes);

      expect(path1).toEqual({ field: field1, stage: stage1, game: game1 });
      expect(path2).toEqual({ field: field2, stage: stage2, game: game2 });
    });

    it('returns null when game parentId is null', () => {
      const game = createGame('game1', 'Match 1', 'stage1');
      game.parentId = undefined;
      const nodes: FlowNode[] = [game];

      const result = getGamePath('game1', nodes);

      expect(result).toBeNull();
    });

    it('returns null when stage parentId is null', () => {
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      stage.parentId = undefined;
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [stage, game];

      const result = getGamePath('game1', nodes);

      expect(result).toBeNull();
    });
  });

  describe('areGamesInSameStage', () => {
    it('returns false when either game path is invalid', () => {
      const nodes: FlowNode[] = [];

      const result = areGamesInSameStage('game1', 'game2', nodes);

      expect(result).toBe(false);
    });

    it('returns true when both games are in the same stage', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [field, stage, game1, game2];

      const result = areGamesInSameStage('game1', 'game2', nodes);

      expect(result).toBe(true);
    });

    it('returns false when games are in different stages', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Final', 'stage2');
      const nodes: FlowNode[] = [field, stage1, stage2, game1, game2];

      const result = areGamesInSameStage('game1', 'game2', nodes);

      expect(result).toBe(false);
    });

    it('returns false when games are in different fields', () => {
      const field1 = createField('field1', 'Feld 1', 0);
      const field2 = createField('field2', 'Feld 2', 1);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Preliminary', 0, 'field2');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 1', 'stage2');
      const nodes: FlowNode[] = [field1, field2, stage1, stage2, game1, game2];

      const result = areGamesInSameStage('game1', 'game2', nodes);

      expect(result).toBe(false);
    });
  });

  describe('areGamesInSameField', () => {
    it('returns false when either game path is invalid', () => {
      const nodes: FlowNode[] = [];

      const result = areGamesInSameField('game1', 'game2', nodes);

      expect(result).toBe(false);
    });

    it('returns true when both games are in the same field (same stage)', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [field, stage, game1, game2];

      const result = areGamesInSameField('game1', 'game2', nodes);

      expect(result).toBe(true);
    });

    it('returns true when both games are in the same field (different stages)', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Final', 'stage2');
      const nodes: FlowNode[] = [field, stage1, stage2, game1, game2];

      const result = areGamesInSameField('game1', 'game2', nodes);

      expect(result).toBe(true);
    });

    it('returns false when games are in different fields', () => {
      const field1 = createField('field1', 'Feld 1', 0);
      const field2 = createField('field2', 'Feld 2', 1);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Preliminary', 0, 'field2');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 1', 'stage2');
      const nodes: FlowNode[] = [field1, field2, stage1, stage2, game1, game2];

      const result = areGamesInSameField('game1', 'game2', nodes);

      expect(result).toBe(false);
    });
  });

  describe('getGamesInStage', () => {
    it('returns empty array when no games exist', () => {
      const nodes: FlowNode[] = [];

      const result = getGamesInStage('stage1', nodes);

      expect(result).toEqual([]);
    });

    it('returns empty array when stage has no games', () => {
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const nodes: FlowNode[] = [stage];

      const result = getGamesInStage('stage1', nodes);

      expect(result).toEqual([]);
    });

    it('returns all games in a stage', () => {
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const nodes: FlowNode[] = [stage, game1, game2];

      const result = getGamesInStage('stage1', nodes);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(game1);
      expect(result).toContainEqual(game2);
    });

    it('filters games from other stages', () => {
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Match 2', 'stage1');
      const game3 = createGame('game3', 'Final', 'stage2');
      const nodes: FlowNode[] = [stage1, stage2, game1, game2, game3];

      const result = getGamesInStage('stage1', nodes);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(game1);
      expect(result).toContainEqual(game2);
      expect(result).not.toContainEqual(game3);
    });

    it('handles non-game nodes in the nodes array', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game1];

      const result = getGamesInStage('stage1', nodes);

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(game1);
    });
  });

  describe('getStagesInField', () => {
    it('returns empty array when no stages exist', () => {
      const nodes: FlowNode[] = [];

      const result = getStagesInField('field1', nodes);

      expect(result).toEqual([]);
    });

    it('returns empty array when field has no stages', () => {
      const field = createField('field1', 'Feld 1', 0);
      const nodes: FlowNode[] = [field];

      const result = getStagesInField('field1', nodes);

      expect(result).toEqual([]);
    });

    it('returns all stages in a field', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field1');
      const nodes: FlowNode[] = [field, stage1, stage2];

      const result = getStagesInField('field1', nodes);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(stage1);
      expect(result).toContainEqual(stage2);
    });

    it('filters stages from other fields', () => {
      const field1 = createField('field1', 'Feld 1', 0);
      const field2 = createField('field2', 'Feld 2', 1);
      const stage1 = createStage('stage1', 'Preliminary', 0, 'field1');
      const stage2 = createStage('stage2', 'Final', 1, 'field1');
      const stage3 = createStage('stage3', 'Preliminary', 0, 'field2');
      const nodes: FlowNode[] = [field1, field2, stage1, stage2, stage3];

      const result = getStagesInField('field1', nodes);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(stage1);
      expect(result).toContainEqual(stage2);
      expect(result).not.toContainEqual(stage3);
    });

    it('sorts stages by order', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage1 = createStage('stage1', 'Preliminary', 2, 'field1');
      const stage2 = createStage('stage2', 'Final', 0, 'field1');
      const stage3 = createStage('stage3', 'Halbfinale', 1, 'field1');
      const nodes: FlowNode[] = [field, stage1, stage2, stage3];

      const result = getStagesInField('field1', nodes);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(stage2); // order 0
      expect(result[1]).toEqual(stage3); // order 1
      expect(result[2]).toEqual(stage1); // order 2
    });

    it('handles non-stage nodes in the nodes array', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Preliminary', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];

      const result = getStagesInField('field1', nodes);

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(stage);
    });
  });

  describe('getDownstreamGameIds', () => {
    it('returns an empty set when the game feeds nothing', () => {
      const result = getDownstreamGameIds('game1', []);

      expect(result.size).toBe(0);
    });

    it('returns games directly fed by the game', () => {
      const edges = [createEdge('e1', 'game1', 'game2', 'winner', 'home')];

      const result = getDownstreamGameIds('game1', edges);

      expect(result).toEqual(new Set(['game2']));
    });

    it('follows the chain transitively', () => {
      const edges = [
        createEdge('e1', 'game1', 'game2', 'winner', 'home'),
        createEdge('e2', 'game2', 'game3', 'loser', 'away'),
      ];

      const result = getDownstreamGameIds('game1', edges);

      expect(result).toEqual(new Set(['game2', 'game3']));
    });

    it('does not include upstream games that feed into it', () => {
      const edges = [createEdge('e1', 'game1', 'game2', 'winner', 'home')];

      const result = getDownstreamGameIds('game2', edges);

      expect(result.size).toBe(0);
    });

    it('terminates on an existing cycle without infinite recursion', () => {
      const edges = [
        createEdge('e1', 'game1', 'game2', 'winner', 'home'),
        createEdge('e2', 'game2', 'game1', 'winner', 'home'),
      ];

      const result = getDownstreamGameIds('game1', edges);

      expect(result).toEqual(new Set(['game2', 'game1']));
    });
  });

  describe('getEligibleSourceGames', () => {
    // Two fields, a shared preliminary stage (order 0) spanning both fields,
    // and a later final stage (order 1). This mirrors the customer's
    // double-elimination layout where cross-field winner/loser references are
    // needed.
    const field1 = createField('field1', 'Field 1', 0);
    const field2 = createField('field2', 'Field 2', 1);
    const prelimF1 = createStage('prelim-f1', 'Prelims', 0, 'field1');
    const prelimF2 = createStage('prelim-f2', 'Prelims', 0, 'field2');
    const finalF1 = createStage('final-f1', 'Final', 1, 'field1');

    const gameA = createGame('gameA', 'M1', 'prelim-f1'); // prelim, field 1
    const gameB = createGame('gameB', 'M2', 'prelim-f2'); // prelim, field 2
    const gameC = createGame('gameC', 'M3', 'prelim-f1'); // prelim, field 1
    const gameFinal = createGame('gameFinal', 'Final', 'final-f1'); // final

    const nodes: FlowNode[] = [
      field1, field2, prelimF1, prelimF2, finalF1,
      gameA, gameB, gameC, gameFinal,
    ];

    const idsOf = (games: GameNode[]) => games.map(g => g.id).sort();

    it('includes earlier-stage games as sources for a later-stage game', () => {
      const result = getEligibleSourceGames(gameFinal, nodes, []);

      expect(idsOf(result)).toEqual(['gameA', 'gameB', 'gameC']);
    });

    it('includes same-stage games on a different field (cross-field)', () => {
      // gameC (field 1, prelim) should be able to source gameB (field 2, prelim)
      const result = getEligibleSourceGames(gameC, nodes, []);

      expect(idsOf(result)).toContain('gameB');
    });

    it('excludes the target game itself', () => {
      const result = getEligibleSourceGames(gameC, nodes, []);

      expect(idsOf(result)).not.toContain('gameC');
    });

    it('excludes later-stage games (results flow forward)', () => {
      const result = getEligibleSourceGames(gameA, nodes, []);

      expect(idsOf(result)).not.toContain('gameFinal');
    });

    it('excludes a downstream game to prevent a cycle', () => {
      // gameA already feeds gameC; offering gameC as a source for gameA would
      // create A -> C -> A.
      const edges = [createEdge('e1', 'gameA', 'gameC', 'winner', 'home')];

      const result = getEligibleSourceGames(gameA, nodes, edges);

      expect(idsOf(result)).not.toContain('gameC');
    });

    it('sorts eligible games by stage order', () => {
      const result = getEligibleSourceGames(gameFinal, nodes, []);
      const orders = result.map(g => getGamePath(g.id, nodes)!.stage.data.order);

      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });
  });
});
