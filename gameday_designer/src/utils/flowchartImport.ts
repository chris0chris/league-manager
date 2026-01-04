/**
 * Flowchart Import Utility
 *
 * Converts schedule JSON format into the flowchart graph state,
 * creating nodes, edges, and auto-layout.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  FlowState,
  FlowNode,
  FlowEdge,
  FlowField,
  GameInputHandle,
  GlobalTeam,
} from '../types/flowchart';
import {
  createGameNode,
  createFlowField,
  createGameToGameEdge,
} from '../types/flowchart';
import type { ScheduleJson, TeamReference } from '../types/designer';
import { parseTeamReference, formatTeamReference } from './teamReference';

/**
 * Result of the import operation.
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** The imported flow state (if successful) */
  state?: FlowState;
  /** Warning messages (non-fatal issues) */
  warnings: string[];
  /** Error messages (fatal issues) */
  errors: string[];
}

/**
 * Layout configuration for auto-positioning nodes.
 */
interface LayoutConfig {
  /** Horizontal spacing between columns */
  columnWidth: number;
  /** Vertical spacing between rows */
  rowHeight: number;
  /** X offset for team nodes */
  teamNodeX: number;
  /** X offset for game nodes */
  gameNodeX: number;
  /** Starting Y position */
  startY: number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  columnWidth: 250,
  rowHeight: 150,
  teamNodeX: 50,
  gameNodeX: 300,
  startY: 50,
};

// Auto-layout removed - not needed for global team pool approach
// Games are positioned within their container hierarchies (fields/stages)

/**
 * Import schedule JSON into a flow state.
 *
 * @param json - The schedule JSON to import
 * @returns Import result with state or errors
 */
export function importFromScheduleJson(json: unknown): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate input
  if (!Array.isArray(json)) {
    return {
      success: false,
      errors: ['Invalid input: expected an array of field schedules'],
      warnings: [],
    };
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const fields: FlowField[] = [];
  const globalTeams: GlobalTeam[] = [];

  // Track global teams and games for assignments
  const teamLabelMap = new Map<string, string>(); // label -> team id
  const gameNodeMap = new Map<string, string>(); // standing -> game id
  let teamOrder = 0;

  // First pass: Create fields and game nodes, collect unique team labels
  for (let fieldIdx = 0; fieldIdx < json.length; fieldIdx++) {
    const fieldSchedule = json[fieldIdx] as ScheduleJson;

    // Validate field entry
    if (!fieldSchedule || typeof fieldSchedule !== 'object') {
      warnings.push(`Field ${fieldIdx + 1}: Invalid entry, skipped`);
      continue;
    }

    // Create field
    const fieldId = `field-${uuidv4()}`;
    const fieldName = String(fieldSchedule.field ?? `Field ${fieldIdx + 1}`);
    fields.push(createFlowField(fieldId, fieldName, fieldIdx));

    // Create game nodes
    if (!Array.isArray(fieldSchedule.games)) {
      warnings.push(`Field "${fieldName}": No games found`);
      continue;
    }

    for (let gameIdx = 0; gameIdx < fieldSchedule.games.length; gameIdx++) {
      const game = fieldSchedule.games[gameIdx];

      if (!game || typeof game !== 'object') {
        warnings.push(`Field "${fieldName}", Game ${gameIdx + 1}: Invalid entry, skipped`);
        continue;
      }

      const gameId = `game-${uuidv4()}`;
      const standing = game.standing || `Game ${gameIdx + 1}`;

      // Track for assignments
      gameNodeMap.set(standing, gameId);

      // Create game node (teams will be assigned in second pass)
      const gameNode = createGameNode(gameId, { x: 0, y: 0 }, {
        stage: game.stage || 'Vorrunde',
        standing,
        fieldId,
        official: game.official ? parseTeamReference(game.official) : null,
        breakAfter: game.break_after ?? 0,
        homeTeamId: null,
        awayTeamId: null,
        homeTeamDynamic: null,
        awayTeamDynamic: null,
      });

      nodes.push(gameNode);

      // Collect unique team labels for global team pool (static teams only)
      for (const refStr of [game.home, game.away]) {
        if (!refStr) continue;

        const parsed = parseTeamReference(refStr);

        // Only create global teams for static references (not winner/loser)
        if (parsed.type === 'static') {
          const label = parsed.name;
          if (!teamLabelMap.has(label)) {
            const teamId = `team-${uuidv4()}`;
            teamLabelMap.set(label, teamId);

            const newTeam: GlobalTeam = {
              id: teamId,
              label,
              groupId: null,
              order: teamOrder++,
            };
            globalTeams.push(newTeam);
          }
        }
      }
    }
  }

  // Second pass: Assign teams to games and create GameToGameEdges
  for (const fieldSchedule of json as ScheduleJson[]) {
    if (!Array.isArray(fieldSchedule.games)) continue;

    for (const game of fieldSchedule.games) {
      if (!game || typeof game !== 'object') continue;

      const gameId = gameNodeMap.get(game.standing);
      if (!gameId) continue;

      // Find the game node
      const gameNode = nodes.find((n) => n.id === gameId);
      if (!gameNode) continue;

      // Process home and away teams
      for (const [refStr, slot] of [
        [game.home, 'home'],
        [game.away, 'away'],
      ] as const) {
        if (!refStr) continue;

        const parsed = parseTeamReference(refStr);

        if (parsed.type === 'winner' || parsed.type === 'loser') {
          // Game-to-game edge (for dynamic team assignment)
          const sourceGameId = gameNodeMap.get(parsed.matchName);
          if (sourceGameId) {
            const edge = createGameToGameEdge(
              `edge-${uuidv4()}`,
              sourceGameId,
              parsed.type,
              gameId,
              slot as GameInputHandle
            );
            edges.push(edge);
          } else {
            warnings.push(
              `Game "${game.standing}": Referenced match "${parsed.matchName}" not found`
            );
          }
        } else if (parsed.type === 'static') {
          // Static team assignment via global team pool
          const teamId = teamLabelMap.get(parsed.name);
          if (teamId) {
            // Update game node with team assignment
            const fieldName = slot === 'home' ? 'homeTeamId' : 'awayTeamId';
            (gameNode.data as any)[fieldName] = teamId;
          }
        }
        // Note: Other reference types (groupTeam, standing) are not supported in import
        // They would need additional context (group/standing mappings)
      }
    }
  }

  return {
    success: true,
    state: {
      nodes,
      edges,
      fields,
      globalTeams,
      globalTeamGroups: [],
    },
    warnings,
    errors,
  };
}

/**
 * Validate that JSON is in the expected schedule format.
 *
 * @param json - The JSON to validate
 * @returns Array of validation error messages
 */
export function validateScheduleJson(json: unknown): string[] {
  const errors: string[] = [];

  if (!Array.isArray(json)) {
    return ['Input must be an array'];
  }

  for (let i = 0; i < json.length; i++) {
    const entry = json[i];
    const prefix = `Field ${i + 1}`;

    if (entry === null || typeof entry !== 'object') {
      errors.push(`${prefix}: Entry must be an object`);
      continue;
    }

    const fieldEntry = entry as Record<string, unknown>;

    if (!('field' in fieldEntry)) {
      errors.push(`${prefix}: Missing 'field' property`);
    }

    if (!('games' in fieldEntry)) {
      errors.push(`${prefix}: Missing 'games' property`);
      continue;
    }

    if (!Array.isArray(fieldEntry.games)) {
      errors.push(`${prefix}: 'games' must be an array`);
      continue;
    }

    for (let j = 0; j < fieldEntry.games.length; j++) {
      const game = fieldEntry.games[j];
      const gamePrefix = `${prefix}, Game ${j + 1}`;

      if (game === null || typeof game !== 'object') {
        errors.push(`${gamePrefix}: Game must be an object`);
        continue;
      }

      const gameObj = game as Record<string, unknown>;
      const required = ['stage', 'standing', 'home', 'away'];

      for (const prop of required) {
        if (!(prop in gameObj)) {
          errors.push(`${gamePrefix}: Missing '${prop}' property`);
        } else if (typeof gameObj[prop] !== 'string') {
          errors.push(`${gamePrefix}: '${prop}' must be a string`);
        }
      }
    }
  }

  return errors;
}
