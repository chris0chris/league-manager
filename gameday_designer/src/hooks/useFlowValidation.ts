/**
 * useFlowValidation Hook
 *
 * Provides real-time validation of the flowchart structure:
 * - Incomplete game inputs (missing home/away connections)
 * - Circular dependencies in game connections
 * - Official playing in their own game
 * - Unassigned fields
 * - Duplicate standing names
 * - Orphaned team nodes
 */

import { useMemo } from 'react';
import type {
  FlowNode,
  FlowEdge,
  FlowValidationResult,
  FlowValidationError,
  FlowValidationWarning,
  GameNodeData,
  TeamNodeData,
} from '../types/flowchart';
import {
  isGameNode,
  isTeamNode,
  isFieldNode,
  isStageNode,
  isTeamToGameEdge,
  isGameToGameEdge,
} from '../types/flowchart';
import { formatTeamReference } from '../utils/teamReference';

/**
 * Check if a game node has incomplete inputs.
 */
function checkIncompleteInputs(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  const gameNodes = nodes.filter(isGameNode);

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    // Check if home slot is filled:
    // - Either via edge (dynamic reference from another game)
    // - Or via direct team assignment (homeTeamId)
    // - Or via synced dynamic reference (homeTeamDynamic)
    const homeEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'home'
    );
    const hasHomeTeam = Boolean(homeEdge || data.homeTeamId || data.homeTeamDynamic);

    // Check if away slot is filled:
    // - Either via edge (dynamic reference from another game)
    // - Or via direct team assignment (awayTeamId)
    // - Or via synced dynamic reference (awayTeamDynamic)
    const awayEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'away'
    );
    const hasAwayTeam = Boolean(awayEdge || data.awayTeamId || data.awayTeamDynamic);

    const missingPorts: string[] = [];
    if (!hasHomeTeam) missingPorts.push('home');
    if (!hasAwayTeam) missingPorts.push('away');

    if (missingPorts.length > 0) {
      errors.push({
        id: `${node.id}_incomplete_inputs`,
        type: 'incomplete_game_inputs',
        message: `Game "${data.standing || node.id}" is missing ${missingPorts.join(' and ')} team connection`,
        affectedNodes: [node.id],
      });
    }
  }

  return errors;
}

/**
 * Check for circular dependencies in game-to-game connections.
 */
function checkCircularDependencies(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  // Build a directed graph of game dependencies
  const gameToGameEdges = edges.filter(isGameToGameEdge);

  // Create adjacency list
  const dependencies = new Map<string, Set<string>>();
  for (const edge of gameToGameEdges) {
    if (!dependencies.has(edge.source)) {
      dependencies.set(edge.source, new Set());
    }
    dependencies.get(edge.source)!.add(edge.target);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(nodeId: string, path: string[]): string[] | null {
    if (inStack.has(nodeId)) {
      // Found a cycle - return the cycle path
      const cycleStart = path.indexOf(nodeId);
      return path.slice(cycleStart);
    }
    if (visited.has(nodeId)) {
      return null;
    }

    visited.add(nodeId);
    inStack.add(nodeId);

    const deps = dependencies.get(nodeId) || new Set();
    for (const dep of deps) {
      const cycle = hasCycle(dep, [...path, nodeId]);
      if (cycle) {
        return cycle;
      }
    }

    inStack.delete(nodeId);
    return null;
  }

  // Check each game node for cycles
  const gameNodes = nodes.filter(isGameNode);
  const reportedCycles = new Set<string>();

  for (const node of gameNodes) {
    visited.clear();
    inStack.clear();

    const cycle = hasCycle(node.id, []);
    if (cycle) {
      // Create a unique key for this cycle to avoid duplicates
      const cycleKey = [...cycle].sort().join('-');
      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);

        // Get standing names for better error message
        const standingNames = cycle.map((id) => {
          const gameNode = nodes.find((n) => n.id === id);
          return gameNode
            ? (gameNode.data as GameNodeData).standing || id
            : id;
        });

        errors.push({
          id: `circular_dependency_${cycleKey}`,
          type: 'circular_dependency',
          message: `Circular dependency detected: ${standingNames.join(' -> ')} -> ${standingNames[0]}`,
          affectedNodes: cycle,
        });
      }
    }
  }

  return errors;
}

/**
 * Check if official is one of the playing teams.
 */
function checkOfficialPlaying(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  const gameNodes = nodes.filter(isGameNode);

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    if (!data.official) continue;

    // Get the team references connected to home and away
    const homeEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'home'
    );
    const awayEdge = edges.find(
      (e) => e.target === node.id && e.targetHandle === 'away'
    );

    const officialStr = formatTeamReference(data.official);

    // Check if official matches home team
    if (homeEdge && isTeamToGameEdge(homeEdge)) {
      const homeNode = nodes.find((n) => n.id === homeEdge.source);
      if (homeNode && isTeamNode(homeNode)) {
        const homeData = homeNode.data as TeamNodeData;
        const homeStr = formatTeamReference(homeData.reference);
        if (homeStr === officialStr) {
          errors.push({
            id: `${node.id}_official_playing_home`,
            type: 'official_playing',
            message: `Game "${data.standing}": Team "${officialStr}" cannot officiate a game they are playing in`,
            affectedNodes: [node.id, homeNode.id],
          });
        }
      }
    }

    // Check if official matches away team
    if (awayEdge && isTeamToGameEdge(awayEdge)) {
      const awayNode = nodes.find((n) => n.id === awayEdge.source);
      if (awayNode && isTeamNode(awayNode)) {
        const awayData = awayNode.data as TeamNodeData;
        const awayStr = formatTeamReference(awayData.reference);
        if (awayStr === officialStr) {
          errors.push({
            id: `${node.id}_official_playing_away`,
            type: 'official_playing',
            message: `Game "${data.standing}": Team "${officialStr}" cannot officiate a game they are playing in`,
            affectedNodes: [node.id, awayNode.id],
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Check for duplicate standing names.
 */
function checkDuplicateStandings(nodes: FlowNode[]): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];

  const gameNodes = nodes.filter(isGameNode);
  const standingCounts = new Map<string, string[]>();

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;
    if (data.standing && data.standing.trim()) {
      const existing = standingCounts.get(data.standing) || [];
      existing.push(node.id);
      standingCounts.set(data.standing, existing);
    }
  }

  for (const [standing, nodeIds] of standingCounts) {
    if (nodeIds.length > 1) {
      warnings.push({
        id: `duplicate_standing_${standing}`,
        type: 'duplicate_standing',
        message: `Standing "${standing}" is used by ${nodeIds.length} games`,
        affectedNodes: nodeIds,
      });
    }
  }

  return warnings;
}

/**
 * Check for orphaned team nodes (no outgoing connections).
 */
function checkOrphanedTeams(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];

  const teamNodes = nodes.filter(isTeamNode);

  for (const node of teamNodes) {
    const outgoingEdges = edges.filter((e) => e.source === node.id);

    if (outgoingEdges.length === 0) {
      const data = node.data as TeamNodeData;
      warnings.push({
        id: `${node.id}_orphaned`,
        type: 'orphaned_team',
        message: `Team "${data.label || formatTeamReference(data.reference)}" is not connected to any game`,
        affectedNodes: [node.id],
      });
    }
  }

  return warnings;
}

/**
 * Check for games with no field assigned.
 * In v2 container model, games inside a stage hierarchy derive their field
 * from the parent stage's parent field.
 */
function checkUnassignedFields(nodes: FlowNode[]): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];

  const gameNodes = nodes.filter(isGameNode);

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    // In v2 model, check if game has parent stage with parent field
    const hasContainerField = Boolean(node.parentId) && isGameInValidHierarchy(node, nodes);

    // In v1 model, check fieldId property
    const hasLegacyField = data.fieldId !== null;

    if (!hasContainerField && !hasLegacyField) {
      warnings.push({
        id: `${node.id}_unassigned_field`,
        type: 'unassigned_field',
        message: `Game "${data.standing || node.id}" has no field assigned`,
        affectedNodes: [node.id],
      });
    }
  }

  return warnings;
}

/**
 * Helper: Check if a game node is in a valid container hierarchy (stage -> field).
 */
function isGameInValidHierarchy(gameNode: FlowNode, nodes: FlowNode[]): boolean {
  if (!gameNode.parentId) return false;

  // Parent should be a stage
  const parent = nodes.find((n) => n.id === gameNode.parentId);
  if (!parent || !isStageNode(parent)) return false;

  // Stage's parent should be a field
  if (!parent.parentId) return false;
  const grandparent = nodes.find((n) => n.id === parent.parentId);
  if (!grandparent || !isFieldNode(grandparent)) return false;

  return true;
}

/**
 * Check for games outside containers (v2 model).
 * ERRORS if a game exists without being inside a stage (strict hierarchy enforcement).
 */
function checkGamesOutsideContainers(nodes: FlowNode[]): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  const gameNodes = nodes.filter(isGameNode);

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;

    // Game MUST have a parent stage
    if (!node.parentId) {
      errors.push({
        id: `${node.id}_outside_container`,
        type: 'game_outside_container',
        message: `Game "${data.standing || node.id}" must be inside a stage container`,
        affectedNodes: [node.id],
      });
      continue;
    }

    // Verify parent is actually a stage
    const parent = nodes.find((n) => n.id === node.parentId);
    if (!parent || !isStageNode(parent)) {
      errors.push({
        id: `${node.id}_outside_container`,
        type: 'game_outside_container',
        message: `Game "${data.standing || node.id}" parent is not a valid stage`,
        affectedNodes: [node.id],
      });
    }
  }

  return errors;
}

/**
 * Check for teams outside containers (v2 model).
 * ERRORS if a team exists without being inside a stage (strict hierarchy enforcement).
 */
function checkTeamsOutsideContainers(nodes: FlowNode[]): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  const teamNodes = nodes.filter(isTeamNode);

  for (const node of teamNodes) {
    const data = node.data as TeamNodeData;

    // Team MUST have a parent stage
    if (!node.parentId) {
      errors.push({
        id: `${node.id}_outside_container`,
        type: 'team_outside_container',
        message: `Team "${data.label || node.id}" must be inside a stage container`,
        affectedNodes: [node.id],
      });
      continue;
    }

    // Verify parent is actually a stage
    const parent = nodes.find((n) => n.id === node.parentId);
    if (!parent || !isStageNode(parent)) {
      errors.push({
        id: `${node.id}_outside_container`,
        type: 'team_outside_container',
        message: `Team "${data.label || node.id}" parent is not a valid stage`,
        affectedNodes: [node.id],
      });
    }
  }

  return errors;
}

/**
 * Check for stages outside fields (v2 model).
 * Errors if a stage exists without being inside a field.
 */
function checkStagesOutsideFields(nodes: FlowNode[]): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  const stageNodes = nodes.filter(isStageNode);

  for (const node of stageNodes) {
    const data = node.data;

    // Stage must have a parent field
    if (!node.parentId) {
      errors.push({
        id: `${node.id}_outside_field`,
        type: 'stage_outside_field',
        message: `Stage "${data.name}" is not inside a field container`,
        affectedNodes: [node.id],
      });
      continue;
    }

    // Verify parent exists and is a field
    const parent = nodes.find((n) => n.id === node.parentId);
    if (!parent || !isFieldNode(parent)) {
      errors.push({
        id: `${node.id}_outside_field`,
        type: 'stage_outside_field',
        message: `Stage "${data.name}" parent is not a valid field`,
        affectedNodes: [node.id],
      });
    }
  }

  return errors;
}

/**
 * useFlowValidation hook.
 *
 * Validates the flowchart and returns errors and warnings.
 *
 * @param nodes - The nodes to validate
 * @param edges - The edges to validate
 * @returns Validation result with errors and warnings
 */
export function useFlowValidation(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationResult {
  return useMemo(() => {
    const errors: FlowValidationError[] = [
      ...checkIncompleteInputs(nodes, edges),
      ...checkCircularDependencies(nodes, edges),
      ...checkOfficialPlaying(nodes, edges),
      ...checkStagesOutsideFields(nodes),
      ...checkGamesOutsideContainers(nodes),
      ...checkTeamsOutsideContainers(nodes),
    ];

    const warnings: FlowValidationWarning[] = [
      ...checkDuplicateStandings(nodes),
      ...checkOrphanedTeams(nodes, edges),
      ...checkUnassignedFields(nodes),
    ];

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [nodes, edges]);
}
