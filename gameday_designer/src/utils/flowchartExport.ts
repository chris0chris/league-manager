/**
 * Flowchart Export Utility
 *
 * Converts the flowchart graph state to the schedule JSON format
 * compatible with schedule_*.json files and schedule_manager.py.
 */

import type {
  FlowState,
  FlowNode,
  FlowEdge,
  FlowField,
  GameNodeData,
  TeamNodeData,
  FieldNodeData,
  StageNodeData,
} from '../types/flowchart';
import {
  isGameNode,
  isTeamNode,
  isFieldNode,
  isStageNode,
  isTeamToGameEdge,
  isGameToGameEdge,
} from '../types/flowchart';
import type { ScheduleJson, GameJson, TeamReference } from '../types/designer';
import { formatTeamReference } from './teamReference';

/**
 * Result of the export operation.
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  /** The exported schedule JSON (if successful) */
  data?: ScheduleJson[];
  /** Error messages (if any) */
  errors: string[];
}

/**
 * Derive a team reference using dual-priority resolution.
 *
 * Priority 1: Dynamic reference from GameToGameEdge (homeTeamDynamic/awayTeamDynamic)
 * Priority 2: Static reference from global team pool (homeTeamId/awayTeamId)
 *
 * @param gameNode - The game node
 * @param slot - The team slot (home or away)
 * @param globalTeams - All global teams
 * @returns The derived team reference
 */
function deriveTeamReference(
  gameNode: FlowNode,
  slot: 'home' | 'away',
  globalTeams: { id: string; label: string }[]
): TeamReference {
  const data = gameNode.data as GameNodeData;

  // Priority 1: Check for dynamic team reference (from GameToGameEdge)
  const dynamicRef = slot === 'home' ? data.homeTeamDynamic : data.awayTeamDynamic;
  if (dynamicRef) {
    return dynamicRef;
  }

  // Priority 2: Check for static team reference (from global team pool)
  const teamId = slot === 'home' ? data.homeTeamId : data.awayTeamId;
  if (teamId) {
    const team = globalTeams.find((t) => t.id === teamId);
    if (team) {
      return { type: 'static', name: team.label };
    }
  }

  // Fallback: No team assigned
  return { type: 'static', name: 'TBD' };
}

/**
 * Get the parent stage of a game node from container hierarchy.
 */
function getGameStage(node: FlowNode, nodes: FlowNode[]): FlowNode | null {
  if (!node.parentId) return null;
  const parent = nodes.find((n) => n.id === node.parentId);
  if (parent && isStageNode(parent)) return parent;
  return null;
}

/**
 * Get the parent field of a game node from container hierarchy.
 * Traverses game -> stage -> field.
 */
function getGameField(node: FlowNode, nodes: FlowNode[]): FlowNode | null {
  const stage = getGameStage(node, nodes);
  if (!stage || !stage.parentId) return null;
  const field = nodes.find((n) => n.id === stage.parentId);
  if (field && isFieldNode(field)) return field;
  return null;
}

/**
 * Derive the stage name for a game node.
 * Prefers container hierarchy, falls back to data.stage.
 */
function deriveGameStage(node: FlowNode, nodes: FlowNode[]): string {
  const containerStage = getGameStage(node, nodes);
  if (containerStage) {
    return (containerStage.data as StageNodeData).name;
  }
  // Fall back to legacy stage property
  return (node.data as GameNodeData).stage;
}

/**
 * Export a single game node to GameJson format.
 */
function exportGameNode(
  node: FlowNode,
  nodes: FlowNode[],
  globalTeams: { id: string; label: string }[]
): GameJson {
  const data = node.data as GameNodeData;

  // Derive team references using dual-priority resolution
  const homeRef = deriveTeamReference(node, 'home', globalTeams);
  const awayRef = deriveTeamReference(node, 'away', globalTeams);

  // Derive stage from container hierarchy
  const stageName = deriveGameStage(node, nodes);

  const game: GameJson = {
    stage: stageName,
    standing: data.standing,
    home: formatTeamReference(homeRef),
    away: formatTeamReference(awayRef),
    official: data.official ? formatTeamReference(data.official) : '',
  };

  if (data.breakAfter > 0) {
    game.break_after = data.breakAfter;
  }

  return game;
}

/**
 * Container field info for grouping games.
 */
interface FieldInfo {
  id: string;
  name: string;
  order: number;
  isContainer: boolean;
}

/**
 * Get all fields (both container and legacy) for grouping.
 */
function getAllFields(
  nodes: FlowNode[],
  legacyFields: FlowField[]
): FieldInfo[] {
  const fields: FieldInfo[] = [];

  // Add container fields from node hierarchy
  const fieldNodes = nodes.filter(isFieldNode);
  for (const node of fieldNodes) {
    const data = node.data as FieldNodeData;
    fields.push({
      id: node.id,
      name: data.name,
      order: data.order,
      isContainer: true,
    });
  }

  // Add legacy fields
  for (const field of legacyFields) {
    // Skip if already added from container
    if (!fields.some((f) => f.id === field.id)) {
      fields.push({
        id: field.id,
        name: field.name,
        order: field.order,
        isContainer: false,
      });
    }
  }

  return fields.sort((a, b) => a.order - b.order);
}

/**
 * Group game nodes by their assigned field.
 * Supports both container hierarchy and legacy fieldId.
 */
function groupGamesByField(
  nodes: FlowNode[],
  fields: FlowField[]
): Map<string, { fieldInfo: FieldInfo; games: FlowNode[] }> {
  const allFields = getAllFields(nodes, fields);
  const gamesByField = new Map<string, { fieldInfo: FieldInfo; games: FlowNode[] }>();

  // Initialize with all fields (even empty ones)
  for (const field of allFields) {
    gamesByField.set(field.id, { fieldInfo: field, games: [] });
  }

  // Group games by field
  const gameNodes = nodes.filter(isGameNode);
  for (const node of gameNodes) {
    // Try container hierarchy first
    const containerField = getGameField(node, nodes);
    if (containerField && gamesByField.has(containerField.id)) {
      gamesByField.get(containerField.id)!.games.push(node);
      continue;
    }

    // Fall back to legacy fieldId
    const legacyFieldId = (node.data as GameNodeData).fieldId;
    if (legacyFieldId && gamesByField.has(legacyFieldId)) {
      gamesByField.get(legacyFieldId)!.games.push(node);
    }
    // Note: Games without field assignment are skipped
  }

  return gamesByField;
}

/**
 * Export the flowchart state to schedule JSON format.
 *
 * @param state - The flow state to export
 * @returns Export result with data or errors
 */
export function exportToScheduleJson(state: FlowState): ExportResult {
  const { nodes, fields, globalTeams } = state;
  const errors: string[] = [];

  // Check for games without field assignment
  // Games are assigned if they have a container field (via hierarchy) or a legacy fieldId
  const gameNodes = nodes.filter(isGameNode);
  const unassignedGames = gameNodes.filter((n) => {
    const hasContainerField = getGameField(n, nodes) !== null;
    const hasLegacyField = (n.data as GameNodeData).fieldId !== null;
    return !hasContainerField && !hasLegacyField;
  });

  if (unassignedGames.length > 0) {
    const standings = unassignedGames
      .map((n) => (n.data as GameNodeData).standing || n.id)
      .join(', ');
    errors.push(`Games without field assignment: ${standings}`);
  }

  // Check for incomplete games (no team assignment)
  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    // A game is complete if it has at least one of:
    // - homeTeamDynamic OR homeTeamId
    // - awayTeamDynamic OR awayTeamId
    const hasHome = data.homeTeamDynamic || data.homeTeamId;
    const hasAway = data.awayTeamDynamic || data.awayTeamId;

    if (!hasHome || !hasAway) {
      errors.push(
        `Game "${data.standing || node.id}" has incomplete team assignments`
      );
    }
  }

  // If there are errors, return failure
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Group games by field
  const gamesByField = groupGamesByField(nodes, fields);

  // Build schedule JSON
  const schedules: ScheduleJson[] = [];

  for (const [, { fieldInfo, games: fieldGames }] of gamesByField) {
    if (fieldGames.length === 0) continue;

    const games: GameJson[] = fieldGames.map((node) =>
      exportGameNode(node, nodes, globalTeams)
    );

    schedules.push({
      field: fieldInfo.name,
      games,
    });
  }

  return {
    success: true,
    data: schedules,
    errors: [],
  };
}

/**
 * Export the flowchart state and download as JSON file.
 *
 * @param state - The flow state to export
 * @param filename - Optional filename (defaults to generated name)
 * @returns Export result
 */
export function downloadFlowchartAsJson(
  state: FlowState,
  filename?: string
): ExportResult {
  const result = exportToScheduleJson(state);

  if (!result.success || !result.data) {
    return result;
  }

  const jsonString = JSON.stringify(result.data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const gameCount = state.nodes.filter(isGameNode).length;
  const fieldCount = state.fields.length;
  const defaultFilename = `schedule_${gameCount}_games_${fieldCount}_fields.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return result;
}

/**
 * Validate that a flowchart state can be exported.
 *
 * @param state - The flow state to validate
 * @returns Array of validation error messages
 */
export function validateForExport(state: FlowState): string[] {
  const { nodes, fields } = state;
  const errors: string[] = [];

  // Check for at least one field (container nodes or legacy fields)
  const containerFieldNodes = nodes.filter(isFieldNode);
  if (fields.length === 0 && containerFieldNodes.length === 0) {
    errors.push('At least one field is required');
  }

  // Check for at least one game
  const gameNodes = nodes.filter(isGameNode);
  if (gameNodes.length === 0) {
    errors.push('At least one game is required');
  }

  // Check each game
  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    // Check for standing
    if (!data.standing || !data.standing.trim()) {
      errors.push(`Game "${node.id}" has no standing/match ID`);
    }

    // Check for field assignment (container hierarchy or legacy fieldId)
    const hasContainerField = getGameField(node, nodes) !== null;
    const hasLegacyField = data.fieldId !== null;
    if (!hasContainerField && !hasLegacyField) {
      errors.push(`Game "${data.standing || node.id}" has no field assigned`);
    }

    // Check for team assignments (dynamic OR static)
    const hasHome = data.homeTeamDynamic || data.homeTeamId;
    const hasAway = data.awayTeamDynamic || data.awayTeamId;

    if (!hasHome) {
      errors.push(`Game "${data.standing || node.id}" is missing home team`);
    }
    if (!hasAway) {
      errors.push(`Game "${data.standing || node.id}" is missing away team`);
    }
  }

  return errors;
}
