import type { GameNode } from '../types/flowchart';

/**
 * Result of ranking calculation.
 * List of team IDs in order.
 */
export type RankingResult = string[];

/**
 * Identifies all unique teams participating in a set of games.
 * 
 * @param games - List of game nodes
 * @returns Array of unique team IDs (GlobalTeam.id)
 */
export function getStageParticipants(games: GameNode[]): string[] {
  const participants = new Set<string>();
  
  games.forEach(game => {
    if (game.data.homeTeamId) participants.add(game.data.homeTeamId);
    if (game.data.awayTeamId) participants.add(game.data.awayTeamId);
  });
  
  return Array.from(participants);
}

/**
 * Calculates the ranking for a Ranking Stage.
 * 
 * NOTE: In the DESIGN phase, we don't have game scores.
 * The ranking here represents the "slots" available for selection by subsequent stages.
 * By default, it returns the participants in alphabetical or order-based sequence.
 * 
 * @param games - List of game nodes in the stage
 * @returns Ordered list of team IDs
 */
export function calculateRanking(games: GameNode[]): RankingResult {
  // Extract all unique participants
  const participants = getStageParticipants(games);
  
  // For the designer, we just need a consistent list of "available ranks".
  // Sorting for predictability in the UI.
  return participants.sort();
}
