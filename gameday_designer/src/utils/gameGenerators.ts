/**
 * Game Generation Utilities
 *
 * Provides template-based game generation for different progression modes:
 * - Round Robin: Circular algorithm for group stage scheduling
 * - Placement: Bracket structures for determining final positions
 */

import { v4 as uuidv4 } from 'uuid';
import type { RoundRobinConfig, PlacementConfig, GameNode } from '../types/flowchart';
import { createGameNodeInStage } from '../types/flowchart';

/**
 * Generates games for a round robin tournament using the circular rotation algorithm.
 *
 * The circular algorithm ensures balanced scheduling where each team plays
 * against every other team exactly once (or twice for double round robin).
 *
 * @param stageId - The parent stage ID
 * @param config - Round robin configuration (team count, single/double round)
 * @returns Array of GameNode objects ready to be added to the stage
 *
 * @example
 * ```typescript
 * const config = { mode: 'round_robin', teamCount: 4, doubleRound: false };
 * const games = generateRoundRobinGames('stage-1', config);
 * // Returns 6 games (4 teams * 3 opponents / 2)
 * ```
 */
export function generateRoundRobinGames(
  stageId: string,
  config: RoundRobinConfig,
  duration?: number,
  breakDuration?: number
): GameNode[] {
  const { teamCount, doubleRound } = config;
  const games: GameNode[] = [];
  const gameDuration = duration ?? 50;
  const gameBreak = breakDuration ?? 0;

  // Circular rotation algorithm for round robin
  // For N teams, we need N rounds if odd (to account for byes), N-1 if even
  const isOdd = teamCount % 2 === 1;
  const adjustedTeamCount = isOdd ? teamCount + 1 : teamCount; // Add dummy team for odd count
  const roundsPerCycle = adjustedTeamCount - 1;
  const rounds = doubleRound ? 2 * roundsPerCycle : roundsPerCycle;

  // Create team array (with dummy team if odd)
  const teams = Array.from({ length: adjustedTeamCount }, (_, i) => i < teamCount ? i + 1 : 0);
  let gameCounter = 1;

  for (let round = 0; round < rounds; round++) {
    // In each round, pair teams using circular rotation
    for (let i = 0; i < Math.floor(adjustedTeamCount / 2); i++) {
      const team1Index = i;
      const team2Index = adjustedTeamCount - 1 - i;
      const team1 = teams[team1Index];
      const team2 = teams[team2Index];

      // Skip if either team is the dummy (0) or if they're the same
      if (team1 === 0 || team2 === 0 || team1 === team2) continue;

      const gameId = uuidv4();
      const game = createGameNodeInStage(
        gameId,
        stageId,
        {
          standing: `Game ${gameCounter}`,
          duration: gameDuration,
          breakAfter: gameBreak,
          manualTime: false,
          startTime: undefined,
          homeTeamId: null,
          awayTeamId: null,
          homeTeamDynamic: null,
          awayTeamDynamic: null,
        },
        { x: 30, y: 50 }
      );

      games.push(game);
      gameCounter++;
    }

    // Rotate teams (keep first team fixed, rotate others)
    if (adjustedTeamCount > 2 && round < rounds - 1) {
      const lastTeam = teams.pop()!;
      teams.splice(1, 0, lastTeam);
    }
  }

  return games;
}

/**
 * Generates games for placement rounds using bracket structures.
 *
 * Supports two formats:
 * - single_elimination: Traditional bracket (semifinals, finals, third-place)
 * - crossover: Crossover format (1st vs 4th, 2nd vs 3rd, then finals)
 *
 * @param stageId - The parent stage ID
 * @param config - Placement configuration (positions, format)
 * @returns Array of GameNode objects ready to be added to the stage
 *
 * @example
 * ```typescript
 * const config = { mode: 'placement', positions: 4, format: 'single_elimination' };
 * const games = generatePlacementGames('stage-1', config);
 * // Returns 4 games: SF1, SF2, Final, 3rd Place
 * ```
 */
export function generatePlacementGames(
  stageId: string,
  config: PlacementConfig,
  duration?: number,
  breakDuration?: number
): GameNode[] {
  const { positions, format } = config;
  const games: GameNode[] = [];

  if (format === 'single_elimination') {
    return generateSingleEliminationGames(stageId, positions, duration, breakDuration);
  } else if (format === 'crossover') {
    return generateCrossoverGames(stageId, positions, duration, breakDuration);
  }

  return games;
}

/**
 * Generates single elimination bracket games.
 *
 * Structure for 4 positions: SF1, SF2, Final, 3rd Place
 * Structure for 8 positions: QF1-4, SF1-2, Final, 3rd Place
 *
 * @param stageId - The parent stage ID
 * @param positions - Number of positions to determine
 * @returns Array of GameNode objects
 */
function generateSingleEliminationGames(
  stageId: string,
  positions: number,
  duration?: number,
  breakDuration?: number
): GameNode[] {
  const games: GameNode[] = [];

  if (positions === 2) {
    // Just a final
    games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
    return games;
  }

  if (positions === 4) {
    // 2 semifinals + final + 3rd place
    games.push(createPlacementGame(stageId, 'SF1', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'SF2', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
    games.push(createPlacementGame(stageId, '3rd Place', duration, breakDuration));
    return games;
  }

  if (positions === 8) {
    // 4 quarterfinals + 2 semifinals + final + 3rd place
    games.push(createPlacementGame(stageId, 'QF1', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'QF2', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'QF3', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'QF4', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'SF1', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'SF2', duration, breakDuration));
    games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
    games.push(createPlacementGame(stageId, '3rd Place', duration, breakDuration));
    return games;
  }

  // For other position counts, just create a final
  games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
  return games;
}

/**
 * Generates crossover format games.
 *
 * Structure for 4 positions: CO1 (1v4), CO2 (2v3), Final, 3rd Place
 *
 * @param stageId - The parent stage ID
 * @param positions - Number of positions to determine
 * @returns Array of GameNode objects
 */
function generateCrossoverGames(
  stageId: string,
  positions: number,
  duration?: number,
  breakDuration?: number
): GameNode[] {
  const games: GameNode[] = [];

  if (positions === 2) {
    // Just a final
    games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
    return games;
  }

  if (positions === 4) {
    // Crossover: 1v4, 2v3, then finals
    games.push(createPlacementGame(stageId, 'CO1', duration, breakDuration)); // 1st vs 4th
    games.push(createPlacementGame(stageId, 'CO2', duration, breakDuration)); // 2nd vs 3rd
    games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
    games.push(createPlacementGame(stageId, '3rd Place', duration, breakDuration));
    return games;
  }

  // For other position counts, fallback to simple final
  games.push(createPlacementGame(stageId, 'Final', duration, breakDuration));
  return games;
}

/**
 * Helper to create a single placement game with standard settings.
 *
 * @param stageId - The parent stage ID
 * @param standing - The standing/label for the game
 * @returns A GameNode object
 */
function createPlacementGame(stageId: string, standing: string, duration?: number, breakDuration?: number): GameNode {
  const gameId = uuidv4();
  return createGameNodeInStage(
    gameId,
    stageId,
    {
      standing,
      duration: duration ?? 50,
      breakAfter: breakDuration ?? 0,
      manualTime: false,
      startTime: undefined,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamDynamic: null,
      awayTeamDynamic: null,
    },
    { x: 30, y: 50 }
  );
}
