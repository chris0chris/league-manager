/**
 * Bracket Edge Generator
 *
 * Pure business logic for creating tournament bracket progression edges.
 * Handles single elimination and crossover tournament formats.
 *
 * @module bracketEdgeGenerator
 */

import type { GameNode, StageNodeData } from '../types/flowchart';
import {
  BRACKET_SIZE_FINAL_ONLY,
  BRACKET_SIZE_WITH_SEMIFINALS,
  BRACKET_SIZE_WITH_QUARTERFINALS,
  GAME_STANDING_FINAL,
  GAME_STANDING_THIRD_PLACE,
  GAME_STANDING_SF1,
  GAME_STANDING_SF2,
  GAME_STANDING_QF1,
  GAME_STANDING_QF2,
  GAME_STANDING_QF3,
  GAME_STANDING_QF4,
  GAME_STANDING_CO1,
  GAME_STANDING_CO2,
  GROUP_A_FIRST_GAME,
  GROUP_A_SECOND_GAME,
  GROUP_A_THIRD_GAME,
  GROUP_B_FIRST_GAME,
  GROUP_B_THIRD_GAME,
  LAST_GAME_OFFSET,
  SECOND_TO_LAST_GAME_OFFSET,
  MIN_TEAMS_FOR_SPLIT_GROUPS,
  MIN_TEAMS_FOR_SEMIFINALS,
  MIN_TEAMS_FOR_BRACKET,
} from './tournamentConstants';

/**
 * Edge specification for game-to-game connections
 */
export interface EdgeSpec {
  sourceGameId: string;
  outputType: 'winner' | 'loser';
  targetGameId: string;
  targetSlot: 'home' | 'away';
}

/**
 * Helper function to find a game by its standing label
 */
function findGameByStanding(games: GameNode[], standing: string): GameNode | undefined {
  return games.find((g) => g.data.standing === standing);
}

/**
 * Create edges based on a custom progression mapping
 */
function createEdgesFromMapping(
  targetGames: GameNode[],
  sourceGames: GameNode[],
  mapping: NonNullable<StageNodeData['progressionMapping']>
): EdgeSpec[] {
  const edges: EdgeSpec[] = [];

  Object.entries(mapping).forEach(([targetStanding, sourceMap]) => {
    const targetGame = findGameByStanding(targetGames, targetStanding);
    if (!targetGame) return;

    // Home slot
    if (sourceGames[sourceMap.home.sourceIndex]) {
      edges.push({
        sourceGameId: sourceGames[sourceMap.home.sourceIndex].id,
        outputType: sourceMap.home.type,
        targetGameId: targetGame.id,
        targetSlot: 'home',
      });
    }

    // Away slot
    if (sourceGames[sourceMap.away.sourceIndex]) {
      edges.push({
        sourceGameId: sourceGames[sourceMap.away.sourceIndex].id,
        outputType: sourceMap.away.type,
        targetGameId: targetGame.id,
        targetSlot: 'away',
      });
    }
  });

  return edges;
}

/**
 * Create edges for split group pattern (6+ source games)
 * Maps: Group A 1st/3rd vs Group B 1st/3rd to semifinals
 */
function createEdgesForSplitGroups(
  sourceGames: GameNode[],
  sf1: GameNode,
  sf2: GameNode
): EdgeSpec[] {
  return [
    {
      sourceGameId: sourceGames[GROUP_A_FIRST_GAME].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sourceGames[GROUP_B_FIRST_GAME].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'away',
    },
    {
      sourceGameId: sourceGames[GROUP_A_THIRD_GAME].id,
      outputType: 'winner',
      targetGameId: sf2.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sourceGames[GROUP_B_THIRD_GAME].id,
      outputType: 'winner',
      targetGameId: sf2.id,
      targetSlot: 'away',
    },
  ];
}

/**
 * Create edges for single group pattern (3-4 source games)
 * Maps winners/losers to semifinals based on group game results
 */
function createEdgesForSingleGroup(
  sourceGames: GameNode[],
  sf1: GameNode,
  sf2: GameNode
): EdgeSpec[] {
  const edges: EdgeSpec[] = [
    {
      sourceGameId: sourceGames[GROUP_A_FIRST_GAME].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sourceGames[GROUP_A_SECOND_GAME].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'away',
    },
    {
      sourceGameId: sourceGames[GROUP_A_THIRD_GAME].id,
      outputType: 'winner',
      targetGameId: sf2.id,
      targetSlot: 'home',
    },
  ];

  // For 4 games, use 4th game winner; for 3 games, use 1st game loser
  if (sourceGames.length >= 4) {
    edges.push({
      sourceGameId: sourceGames[3].id,
      outputType: 'winner',
      targetGameId: sf2.id,
      targetSlot: 'away',
    });
  } else {
    edges.push({
      sourceGameId: sourceGames[GROUP_A_FIRST_GAME].id,
      outputType: 'loser',
      targetGameId: sf2.id,
      targetSlot: 'away',
    });
  }

  return edges;
}

/**
 * Create edges for 2-game pattern
 * Maps winners and losers to both semifinals
 */
function createEdgesForTwoGames(
  sourceGames: GameNode[],
  sf1: GameNode,
  sf2: GameNode
): EdgeSpec[] {
  return [
    {
      sourceGameId: sourceGames[0].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sourceGames[1].id,
      outputType: 'winner',
      targetGameId: sf1.id,
      targetSlot: 'away',
    },
    {
      sourceGameId: sourceGames[0].id,
      outputType: 'loser',
      targetGameId: sf2.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sourceGames[1].id,
      outputType: 'loser',
      targetGameId: sf2.id,
      targetSlot: 'away',
    },
  ];
}

/**
 * Create internal bracket edges (SF → Final/3rd Place)
 */
function createInternalBracketEdges(
  sf1: GameNode,
  sf2: GameNode,
  final: GameNode,
  thirdPlace: GameNode
): EdgeSpec[] {
  return [
    {
      sourceGameId: sf1.id,
      outputType: 'winner',
      targetGameId: final.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sf2.id,
      outputType: 'winner',
      targetGameId: final.id,
      targetSlot: 'away',
    },
    {
      sourceGameId: sf1.id,
      outputType: 'loser',
      targetGameId: thirdPlace.id,
      targetSlot: 'home',
    },
    {
      sourceGameId: sf2.id,
      outputType: 'loser',
      targetGameId: thirdPlace.id,
      targetSlot: 'away',
    },
  ];
}

/**
 * Create edges for 4-team single elimination bracket (SF1, SF2, Final, 3rd Place)
 */
function create4TeamSingleEliminationEdges(
  targetGames: GameNode[],
  sourceGames: GameNode[]
): EdgeSpec[] {
  const edges: EdgeSpec[] = [];

  const sf1 = findGameByStanding(targetGames, GAME_STANDING_SF1);
  const sf2 = findGameByStanding(targetGames, GAME_STANDING_SF2);
  const final = findGameByStanding(targetGames, GAME_STANDING_FINAL);
  const thirdPlace = findGameByStanding(targetGames, GAME_STANDING_THIRD_PLACE);

  // Check if all 4 games are in targetGames (single stage with all games)
  const allGamesInTarget = !!(sf1 && sf2 && final && thirdPlace);

  if (allGamesInTarget) {
    // All games in one stage - create both source edges and internal edges
    if (sourceGames.length > 0 && sf1 && sf2) {
      if (sourceGames.length >= MIN_TEAMS_FOR_SPLIT_GROUPS) {
        // Split groups (e.g., 2 groups × 3 games each)
        edges.push(...createEdgesForSplitGroups(sourceGames, sf1, sf2));
      } else if (sourceGames.length >= MIN_TEAMS_FOR_SEMIFINALS) {
        // Single group (3-4 games for all teams)
        edges.push(...createEdgesForSingleGroup(sourceGames, sf1, sf2));
      } else if (sourceGames.length >= MIN_TEAMS_FOR_BRACKET) {
        // 2 games
        edges.push(...createEdgesForTwoGames(sourceGames, sf1, sf2));
      }
    }

    // Create internal stage connections: SF1/SF2 → Final/3rd Place
    if (sf1 && sf2 && final && thirdPlace) {
      edges.push(...createInternalBracketEdges(sf1, sf2, final, thirdPlace));
    }
  } else {
    // Games split across stages - only create edges from sourceGames
    if (sf1 && sf2 && sourceGames.length > 0) {
      if (sourceGames.length >= MIN_TEAMS_FOR_SPLIT_GROUPS) {
        edges.push(...createEdgesForSplitGroups(sourceGames, sf1, sf2));
      } else if (sourceGames.length >= MIN_TEAMS_FOR_SEMIFINALS) {
        edges.push(...createEdgesForSingleGroup(sourceGames, sf1, sf2));
      } else if (sourceGames.length >= MIN_TEAMS_FOR_BRACKET) {
        edges.push(...createEdgesForTwoGames(sourceGames, sf1, sf2));
      }
    }

    // If final/3rd place exist in this stage, connect from previous stage SFs
    const sourceSF1 = findGameByStanding(sourceGames, GAME_STANDING_SF1);
    const sourceSF2 = findGameByStanding(sourceGames, GAME_STANDING_SF2);

    if (sourceSF1 && sourceSF2) {
      if (final) {
        edges.push(
          {
            sourceGameId: sourceSF1.id,
            outputType: 'winner',
            targetGameId: final.id,
            targetSlot: 'home',
          },
          {
            sourceGameId: sourceSF2.id,
            outputType: 'winner',
            targetGameId: final.id,
            targetSlot: 'away',
          }
        );
      }
      if (thirdPlace) {
        edges.push(
          {
            sourceGameId: sourceSF1.id,
            outputType: 'loser',
            targetGameId: thirdPlace.id,
            targetSlot: 'home',
          },
          {
            sourceGameId: sourceSF2.id,
            outputType: 'loser',
            targetGameId: thirdPlace.id,
            targetSlot: 'away',
          }
        );
      }
    }
  }

  return edges;
}

/**
 * Create edges for 2-team bracket (just a final)
 */
function create2TeamFinalEdges(targetGames: GameNode[], sourceGames: GameNode[]): EdgeSpec[] {
  const edges: EdgeSpec[] = [];
  const final = findGameByStanding(targetGames, GAME_STANDING_FINAL);

  // Map semifinal winners to final
  if (sourceGames.length >= MIN_TEAMS_FOR_BRACKET && final) {
    // Assume source games are semifinals
    const sf1 = sourceGames[sourceGames.length - SECOND_TO_LAST_GAME_OFFSET];
    const sf2 = sourceGames[sourceGames.length - LAST_GAME_OFFSET];

    edges.push(
      {
        sourceGameId: sf1.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: sf2.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'away',
      }
    );
  }

  return edges;
}

/**
 * Create edges for 8-team single elimination bracket (QF1-4, SF1-2, Final, 3rd Place)
 */
function create8TeamSingleEliminationEdges(targetGames: GameNode[]): EdgeSpec[] {
  const edges: EdgeSpec[] = [];

  const qf1 = findGameByStanding(targetGames, GAME_STANDING_QF1);
  const qf2 = findGameByStanding(targetGames, GAME_STANDING_QF2);
  const qf3 = findGameByStanding(targetGames, GAME_STANDING_QF3);
  const qf4 = findGameByStanding(targetGames, GAME_STANDING_QF4);
  const sf1 = findGameByStanding(targetGames, GAME_STANDING_SF1);
  const sf2 = findGameByStanding(targetGames, GAME_STANDING_SF2);
  const final = findGameByStanding(targetGames, GAME_STANDING_FINAL);
  const thirdPlace = findGameByStanding(targetGames, GAME_STANDING_THIRD_PLACE);

  // Quarterfinal winners → Semifinals
  if (qf1 && qf2 && sf1) {
    edges.push(
      {
        sourceGameId: qf1.id,
        outputType: 'winner',
        targetGameId: sf1.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: qf2.id,
        outputType: 'winner',
        targetGameId: sf1.id,
        targetSlot: 'away',
      }
    );
  }

  if (qf3 && qf4 && sf2) {
    edges.push(
      {
        sourceGameId: qf3.id,
        outputType: 'winner',
        targetGameId: sf2.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: qf4.id,
        outputType: 'winner',
        targetGameId: sf2.id,
        targetSlot: 'away',
      }
    );
  }

  // Semifinal winners → Final
  if (sf1 && sf2 && final) {
    edges.push(
      {
        sourceGameId: sf1.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: sf2.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'away',
      }
    );
  }

  // Semifinal losers → 3rd Place
  if (sf1 && sf2 && thirdPlace) {
    edges.push(
      {
        sourceGameId: sf1.id,
        outputType: 'loser',
        targetGameId: thirdPlace.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: sf2.id,
        outputType: 'loser',
        targetGameId: thirdPlace.id,
        targetSlot: 'away',
      }
    );
  }

  return edges;
}

/**
 * Create edges for 4-team crossover format (CO1, CO2, Final, 3rd Place)
 */
function create4TeamCrossoverEdges(targetGames: GameNode[]): EdgeSpec[] {
  const edges: EdgeSpec[] = [];

  const co1 = findGameByStanding(targetGames, GAME_STANDING_CO1);
  const co2 = findGameByStanding(targetGames, GAME_STANDING_CO2);
  const final = findGameByStanding(targetGames, GAME_STANDING_FINAL);
  const thirdPlace = findGameByStanding(targetGames, GAME_STANDING_THIRD_PLACE);

  // Crossover winners → Final
  if (co1 && co2 && final) {
    edges.push(
      {
        sourceGameId: co1.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: co2.id,
        outputType: 'winner',
        targetGameId: final.id,
        targetSlot: 'away',
      }
    );
  }

  // Crossover losers → 3rd Place
  if (co1 && co2 && thirdPlace) {
    edges.push(
      {
        sourceGameId: co1.id,
        outputType: 'loser',
        targetGameId: thirdPlace.id,
        targetSlot: 'home',
      },
      {
        sourceGameId: co2.id,
        outputType: 'loser',
        targetGameId: thirdPlace.id,
        targetSlot: 'away',
      }
    );
  }

  return edges;
}

/**
 * Create placement edges for tournament bracket progression
 *
 * This is the main entry point for generating game-to-game edges based on
 * tournament bracket configuration. Supports single elimination and crossover
 * formats with 2, 4, or 8 team brackets.
 *
 * @param targetGames - Games in the target stage (e.g., playoffs)
 * @param sourceGames - Games from the source stage (e.g., group stage)
 * @param config - Progression configuration from stage data
 * @param mapping - Optional custom progression mapping
 * @returns Array of edge specifications for game-to-game connections
 *
 * @example
 * ```typescript
 * const edges = createPlacementEdges(
 *   playoffGames,
 *   groupGames,
 *   { mode: 'placement', positions: 4, format: 'single_elimination' }
 * );
 * ```
 */
export function createPlacementEdges(
  targetGames: GameNode[],
  sourceGames: GameNode[],
  config: StageNodeData['progressionConfig'],
  mapping?: StageNodeData['progressionMapping']
): EdgeSpec[] {
  if (!config || config.mode !== 'placement') {
    return [];
  }

  const { positions, format } = config;
  const edges: EdgeSpec[] = [];

  try {
    // 1. Add custom entry edges if mapping is provided
    if (mapping && sourceGames.length > 0) {
      edges.push(...createEdgesFromMapping(targetGames, sourceGames, mapping));
    }

    // 2. Add standard bracket edges (source-to-target or internal)
    if (positions === BRACKET_SIZE_WITH_SEMIFINALS && format === 'single_elimination') {
      // If we already added entry edges via mapping, we only need internal edges
      const entryEdgesAdded = mapping && sourceGames.length > 0;
      if (entryEdgesAdded) {
        const sf1 = findGameByStanding(targetGames, GAME_STANDING_SF1);
        const sf2 = findGameByStanding(targetGames, GAME_STANDING_SF2);
        const final = findGameByStanding(targetGames, GAME_STANDING_FINAL);
        const thirdPlace = findGameByStanding(targetGames, GAME_STANDING_THIRD_PLACE);
        if (sf1 && sf2 && final && thirdPlace) {
          edges.push(...createInternalBracketEdges(sf1, sf2, final, thirdPlace));
        }
      } else {
        edges.push(...create4TeamSingleEliminationEdges(targetGames, sourceGames));
      }
    } else if (positions === BRACKET_SIZE_FINAL_ONLY && format === 'single_elimination') {
      if (!(mapping && sourceGames.length > 0)) {
        edges.push(...create2TeamFinalEdges(targetGames, sourceGames));
      }
    } else if (positions === BRACKET_SIZE_WITH_QUARTERFINALS && format === 'single_elimination') {
      edges.push(...create8TeamSingleEliminationEdges(targetGames));
    } else if (positions === BRACKET_SIZE_WITH_SEMIFINALS && format === 'crossover') {
      edges.push(...create4TeamCrossoverEdges(targetGames));
    }
  } catch (error) {
    console.error('Error creating placement edges:', error);
  }

  return edges;
}
