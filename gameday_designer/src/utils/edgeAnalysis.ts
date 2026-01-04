/**
 * Edge Analysis Utilities
 *
 * Utilities for analyzing game-to-game connections via GameToGameEdge.
 * Used for stage progression visualization.
 */

import type {
  FlowNode,
  FlowEdge,
  GameNode,
  StageNode,
  FieldNode,
} from '../types/flowchart';
import { isGameNode, isStageNode, isFieldNode } from '../types/flowchart';

/**
 * Find the source game for a dynamic team reference.
 *
 * Given a target game and slot (home/away), find the source game
 * that provides the team via a GameToGameEdge connection.
 *
 * @param targetGameId - ID of the game receiving the team
 * @param slot - Which slot on the target game ('home' or 'away')
 * @param edges - All edges in the flowchart
 * @param nodes - All nodes in the flowchart
 * @returns The source game node, or null if not found
 */
export function findSourceGameForReference(
  targetGameId: string,
  slot: 'home' | 'away',
  edges: FlowEdge[],
  nodes: FlowNode[]
): GameNode | null {
  // Find edge targeting this game's slot
  const edge = edges.find(
    (e) => e.target === targetGameId && e.targetHandle === slot
  );

  if (!edge) return null;

  // Find source game node
  const sourceNode = nodes.find((n) => n.id === edge.source);
  return sourceNode && isGameNode(sourceNode) ? sourceNode : null;
}

/**
 * Find all games that reference a given source game.
 *
 * Given a source game, find all target games that receive
 * teams from it via GameToGameEdge connections.
 *
 * @param sourceGameId - ID of the source game
 * @param edges - All edges in the flowchart
 * @returns Array of target game references
 */
export function findTargetGamesForSource(
  sourceGameId: string,
  edges: FlowEdge[]
): Array<{
  gameId: string;
  slot: 'home' | 'away';
  outputType: 'winner' | 'loser';
}> {
  return edges
    .filter((e) => e.source === sourceGameId)
    .map((e) => ({
      gameId: e.target,
      slot: e.targetHandle as 'home' | 'away',
      outputType: e.sourceHandle as 'winner' | 'loser',
    }));
}

/**
 * Get the container hierarchy path for a game.
 *
 * Returns the field, stage, and game nodes that make up
 * the full path to a game: field > stage > game
 *
 * @param gameId - ID of the game
 * @param nodes - All nodes in the flowchart
 * @returns The path components, or null if incomplete
 */
export function getGamePath(
  gameId: string,
  nodes: FlowNode[]
): { field: FieldNode; stage: StageNode; game: GameNode } | null {
  // Find game node
  const game = nodes.find((n) => n.id === gameId && isGameNode(n));
  if (!game || !game.parentId) return null;

  // Find parent stage
  const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
  if (!stage || !stage.parentId) return null;

  // Find parent field
  const field = nodes.find((n) => n.id === stage.parentId && isFieldNode(n));
  if (!field) return null;

  return {
    field: field as FieldNode,
    stage: stage as StageNode,
    game: game as GameNode,
  };
}

/**
 * Check if two games are in the same stage.
 *
 * @param gameId1 - ID of first game
 * @param gameId2 - ID of second game
 * @param nodes - All nodes in the flowchart
 * @returns True if both games are in the same stage
 */
export function areGamesInSameStage(
  gameId1: string,
  gameId2: string,
  nodes: FlowNode[]
): boolean {
  const path1 = getGamePath(gameId1, nodes);
  const path2 = getGamePath(gameId2, nodes);

  if (!path1 || !path2) return false;

  return path1.stage.id === path2.stage.id;
}

/**
 * Check if two games are in the same field.
 *
 * @param gameId1 - ID of first game
 * @param gameId2 - ID of second game
 * @param nodes - All nodes in the flowchart
 * @returns True if both games are in the same field
 */
export function areGamesInSameField(
  gameId1: string,
  gameId2: string,
  nodes: FlowNode[]
): boolean {
  const path1 = getGamePath(gameId1, nodes);
  const path2 = getGamePath(gameId2, nodes);

  if (!path1 || !path2) return false;

  return path1.field.id === path2.field.id;
}

/**
 * Get all games in a specific stage.
 *
 * @param stageId - ID of the stage
 * @param nodes - All nodes in the flowchart
 * @returns Array of game nodes in the stage
 */
export function getGamesInStage(stageId: string, nodes: FlowNode[]): GameNode[] {
  return nodes.filter(
    (n): n is GameNode => isGameNode(n) && n.parentId === stageId
  );
}

/**
 * Get all stages in a specific field.
 *
 * @param fieldId - ID of the field
 * @param nodes - All nodes in the flowchart
 * @returns Array of stage nodes in the field
 */
export function getStagesInField(fieldId: string, nodes: FlowNode[]): StageNode[] {
  return nodes
    .filter((n): n is StageNode => isStageNode(n) && n.parentId === fieldId)
    .sort((a, b) => a.data.order - b.data.order);
}
