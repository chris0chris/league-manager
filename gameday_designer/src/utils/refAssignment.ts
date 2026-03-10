/**
 * Smart Referee Assignment Utility
 *
 * Assigns referee teams to games using smart round-robin distribution.
 * Ensures each team refs the least number of times, and never refs when they're playing.
 *
 * @module refAssignment
 */

import type { GameNode, StageNode, GlobalTeam } from '../types/flowchart';
import type { TeamReference } from '../types/designer';

/**
 * Assign referees to games using smart round-robin algorithm
 *
 * Algorithm:
 * 1. For each game, identify the 2 playing teams
 * 2. Find all teams NOT playing in this game
 * 3. Pick the team with the least ref assignments so far
 * 4. Assign that team as the referee
 *
 * @param games - All games in the tournament
 * @param stages - All stages (to determine round/group)
 * @param teams - All available teams in the tournament
 * @param homeTeamRef - Function to resolve home team reference to team name
 * @param awayTeamRef - Function to resolve away team reference to team name
 * @returns Updated games with officials assigned
 */
export function assignRefereesToGames(
  games: GameNode[],
  stages: StageNode[],
  teams: GlobalTeam[]
): GameNode[] {
  // Track how many times each team has been assigned as a referee
  const refCount = new Map<string, number>();

  // Initialize ref counts
  teams.forEach((team) => {
    refCount.set(team.id, 0);
  });

  // Get team IDs from all teams
  const teamIds = teams.map((t) => t.id);

  // Process each game and assign referee
  return games.map((game) => {
    // Find teams NOT playing in this game
    const playingTeamIds = new Set<string>();
    if (game.data.homeTeamId) playingTeamIds.add(game.data.homeTeamId);
    if (game.data.awayTeamId) playingTeamIds.add(game.data.awayTeamId);

    // Filter to available teams (not playing) and sort by ref count (ascending = least refs first)
    const availableRefs = teamIds
      .filter((teamId) => !playingTeamIds.has(teamId))
      .sort((a, b) => (refCount.get(a) ?? 0) - (refCount.get(b) ?? 0));

    // Assign the team with least refs
    if (availableRefs.length > 0) {
      const assignedRefId = availableRefs[0];
      refCount.set(assignedRefId, (refCount.get(assignedRefId) ?? 0) + 1);

      // Create static team reference for the assigned referee
      // We use the team ID as the name to ensure it matches the Select options in the UI
      // and can be resolved back to a real team during export/publish.
      const officialRef: TeamReference = {
        type: 'static',
        name: assignedRefId,
      };

      return {
        ...game,
        data: {
          ...game.data,
          official: officialRef,
        },
      };
    }

    // If no available ref (shouldn't happen with >2 teams), leave as is
    return game;
  });
}
