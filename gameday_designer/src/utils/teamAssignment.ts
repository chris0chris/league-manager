/**
 * Team Assignment Utilities
 *
 * Pure business logic for team generation, color assignment, and
 * tournament team distribution across stages.
 *
 * @module teamAssignment
 */

import type { GlobalTeam, GameNode, StageNode } from '../types/flowchart';
import type { TournamentStructure } from './tournamentGenerator';
import type { EdgeSpec } from './bracketEdgeGenerator';
import { createPlacementEdges } from './bracketEdgeGenerator';
import { TEAM_COLORS } from './tournamentConstants';
import { getRoundRobinPairings } from './roundRobinLogic';

/**
 * Team data for generation
 */
export interface TeamData {
  label: string;
  color: string;
}

/**
 * Team assignment operation types
 */
export type TeamAssignmentOperation =
  | {
      type: 'assign_team';
      gameId: string;
      teamId: string;
      slot: 'home' | 'away';
    }
  | {
      type: 'add_edges';
      edges: EdgeSpec[];
    };

/**
 * Get team color by index from predefined color palette
 *
 * @param index - Team index (0-based)
 * @returns Hex color code
 *
 * @example
 * ```typescript
 * const color = getTeamColor(0); // returns '#3498db' (Blue)
 * const color = getTeamColor(12); // wraps around to first color
 * ```
 */
export function getTeamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

/**
 * Generate team data for tournament
 *
 * Creates team labels and assigns colors from predefined palette.
 * Teams are numbered sequentially starting from the offset.
 *
 * @param count - Number of teams to generate
 * @param startOffset - Starting index for team numbering (default: 0)
 * @returns Array of team data objects with labels and colors
 *
 * @example
 * ```typescript
 * const teams = generateTeamsForTournament(4, 0);
 * // Returns: [
 * //   { label: 'Team 1', color: '#3498db' },
 * //   { label: 'Team 2', color: '#e74c3c' },
 * //   { label: 'Team 3', color: '#2ecc71' },
 * //   { label: 'Team 4', color: '#f39c12' }
 * // ]
 * ```
 */
export function generateTeamsForTournament(count: number, startOffset: number = 0): TeamData[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Team ${startOffset + i + 1}`,
    color: getTeamColor(startOffset + i),
  }));
}

/**
 * Assign teams to tournament games
 *
 * Processes tournament structure and generates assignment operations for:
 * - Round robin stages: Direct team assignments to games
 * - Placement stages: Game-to-game edge connections for bracket progression
 *
 * Returns operations array instead of executing hooks directly, enabling:
 * - Pure functional testing
 * - Preview/logging of assignments
 * - Undo/redo capability
 * - Batch optimization
 *
 * @param structure - Tournament structure with stages and games
 * @param teams - Global teams to assign
 * @returns Array of operations to perform (assign team or add edges)
 *
 * @example
 * ```typescript
 * const structure = generateTournament(teams, config);
 * const operations = assignTeamsToTournamentGames(structure, teams);
 *
 * // Execute operations
 * operations.forEach(op => {
 *   if (op.type === 'assign_team') {
 *     assignTeamToGame(op.gameId, op.teamId, op.slot);
 *   } else if (op.type === 'add_edges') {
 *     addBulkGameToGameEdges(op.edges);
 *   }
 * });
 * ```
 */
export function assignTeamsToTournamentGames(
  structure: TournamentStructure,
  teams: GlobalTeam[]
): TeamAssignmentOperation[] {
  const operations: TeamAssignmentOperation[] = [];

  // Get all stages sorted by order
  const stages = [...structure.stages].sort((a, b) => a.data.order - b.data.order);

  // Group stages by their order (for parallel execution like split groups)
  const stagesByOrder = new Map<number, StageNode[]>();
  stages.forEach((stage) => {
    const order = stage.data.order;
    if (!stagesByOrder.has(order)) {
      stagesByOrder.set(order, []);
    }
    stagesByOrder.get(order)!.push(stage);
  });

  // Track previous stage games for progression mapping (per order)
  let previousOrderGames: GameNode[] = [];

  // Process each stage group
  stagesByOrder.forEach((parallelStages) => {
    // Check if this is a split field assignment (multiple stages at same order)
    const isSplitField = parallelStages.length > 1;

    // Collect games from this order
    const currentOrderGames: GameNode[] = [];

    parallelStages.forEach((stage, stageIndex) => {
      const stageData = stage.data;

      // Get games for this stage, sorted by standing
      const stageGames = structure.games
        .filter((game) => game.parentId === stage.id)
        .sort((a, b) => {
          const aNum = parseInt(a.data.standing.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.data.standing.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });

      if (stageGames.length === 0) {
        return; // No games to assign
      }

      // Process based on progression mode
      if (stageData.progressionMode === 'round_robin') {
        // Assign teams directly to games
        let stageTeams: GlobalTeam[];
        if (isSplitField) {
          // Split teams across stages (Group A gets first half, Group B gets second half, etc.)
          const teamsPerGroup = Math.ceil(teams.length / parallelStages.length);
          const startIndex = stageIndex * teamsPerGroup;
          const endIndex = Math.min(startIndex + teamsPerGroup, teams.length);
          stageTeams = teams.slice(startIndex, endIndex);
        } else {
          // Use all teams for this stage
          stageTeams = teams;
        }

        // Get consistent pairings
        const doubleRound = (stageData.progressionConfig as RoundRobinConfig)?.doubleRound ?? false;
        const pairings = getRoundRobinPairings(stageTeams.length, doubleRound);

        // Assign teams to games using these pairings
        stageGames.forEach((game, index) => {
          if (index < pairings.length) {
            const [homeIdx, awayIdx] = pairings[index];
            
            if (stageTeams[homeIdx]) {
              operations.push({
                type: 'assign_team',
                gameId: game.id,
                teamId: stageTeams[homeIdx].id,
                slot: 'home',
              });
            }

            if (stageTeams[awayIdx]) {
              operations.push({
                type: 'assign_team',
                gameId: game.id,
                teamId: stageTeams[awayIdx].id,
                slot: 'away',
              });
            }
          }
        });

        // Track these games for next order
        currentOrderGames.push(...stageGames);
      } else if (stageData.progressionMode === 'placement') {
        // Create GameToGameEdge connections for placement stages
        const edgesToAdd = createPlacementEdges(
          stageGames,
          previousOrderGames,
          stageData.progressionConfig,
          stageData.progressionMapping
        );

        // Add all edges for this stage in bulk
        if (edgesToAdd.length > 0) {
          operations.push({
            type: 'add_edges',
            edges: edgesToAdd,
          });
        }

        // Track these games for next order
        currentOrderGames.push(...stageGames);
      }
    });

    // Update previous order games for next iteration
    previousOrderGames = currentOrderGames;
  });

  return operations;
}
