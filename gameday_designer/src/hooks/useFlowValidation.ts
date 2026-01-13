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
 * - Cross-stage time overlaps (Phase 3)
 * - Team capacity conflicts (Phase 3)
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
  FlowField,
  GlobalTeam,
  GlobalTeamGroup,
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
import { parseTime } from '../utils/timeCalculation';
import { DEFAULT_GAME_DURATION } from '../utils/tournamentConstants';

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
        messageKey: 'incomplete_game_inputs',
        messageParams: {
            game: data.standing || node.id,
            missing: missingPorts.join(' and ')
        },
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

        const pathString = `${standingNames.join(' -> ')} -> ${standingNames[0]}`;

        errors.push({
          id: `circular_dependency_${cycleKey}`,
          type: 'circular_dependency',
          message: `Circular dependency detected: ${pathString}`,
          messageKey: 'circular_dependency',
          messageParams: {
            path: pathString
          },
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
  edges: FlowEdge[],
  globalTeams: GlobalTeam[] = []
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

    const official = data.official;
    let officialId: string | null = null;
    let officialStr = '';

    if (typeof official === 'string') {
      officialId = official;
      // Resolve team label for display if it's an ID
      const team = globalTeams.find(t => t.id === official);
      officialStr = team?.label || official;
    } else if (official && typeof official === 'object') {
      officialStr = formatTeamReference(official);
    }

    // Check if official matches home team (v2 direct ID)
    if (data.homeTeamId && (data.homeTeamId === officialId || data.homeTeamId === officialStr)) {
      errors.push({
        id: `${node.id}_official_playing_home_v2`,
        type: 'official_playing',
        message: `Game "${data.standing}": Team "${officialStr}" cannot officiate a game they are playing in`,
        messageKey: 'official_playing',
        messageParams: {
            game: data.standing,
            team: officialStr
        },
        affectedNodes: [node.id],
      });
    }

    // Check if official matches away team (v2 direct ID)
    if (data.awayTeamId && (data.awayTeamId === officialId || data.awayTeamId === officialStr)) {
      errors.push({
        id: `${node.id}_official_playing_away_v2`,
        type: 'official_playing',
        message: `Game "${data.standing}": Team "${officialStr}" cannot officiate a game they are playing in`,
        messageKey: 'official_playing',
        messageParams: {
            game: data.standing,
            team: officialStr
        },
        affectedNodes: [node.id],
      });
    }

    // Check if official matches home team (v1 edges)
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
            messageKey: 'official_playing',
            messageParams: {
                game: data.standing,
                team: officialStr
            },
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
            messageKey: 'official_playing',
            messageParams: {
                game: data.standing,
                team: officialStr
            },
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
        messageKey: 'duplicate_standing',
        messageParams: {
            standing: standing,
            count: nodeIds.length
        },
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
        messageKey: 'orphaned_team',
        messageParams: {
            team: data.label || formatTeamReference(data.reference)
        },
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
        messageKey: 'unassigned_field',
        messageParams: {
            game: data.standing || node.id
        },
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
        messageKey: 'game_outside_container',
        messageParams: {
            game: data.standing || node.id
        },
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
        messageKey: 'game_invalid_parent',
        messageParams: {
            game: data.standing || node.id
        },
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
        messageKey: 'team_outside_container',
        messageParams: {
            team: data.label || node.id
        },
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
        messageKey: 'team_invalid_parent',
        messageParams: {
            team: data.label || node.id
        },
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
        messageKey: 'stage_outside_field',
        messageParams: {
            stage: data.name
        },
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
        messageKey: 'stage_invalid_parent',
        messageParams: {
            stage: data.name
        },
        affectedNodes: [node.id],
      });
    }
  }

  return errors;
}

/**
 * Check for time overlaps on fields (Phase 3).
 * Detects if games on the same field have overlapping time slots.
 */
function checkTimeOverlaps(
  nodes: FlowNode[],
  fields: FlowField[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const gameNodes = nodes.filter(isGameNode);
  const stageNodes = nodes.filter(isStageNode);

  // Helper to find the field ID for a game
  const getFieldId = (game: GameNodeData, parentId?: string): string | null => {
    // 1. Direct field assignment (legacy)
    if (game.fieldId) return game.fieldId;

    // 2. Hierarchy: Game -> Stage -> Field
    if (parentId) {
      const parentStage = stageNodes.find(s => s.id === parentId);
      if (parentStage && parentStage.parentId) {
        // Parent of stage is field
        return parentStage.parentId;
      }
    }
    return null;
  };

  // Group games by field
  const gamesByField = new Map<string, { id: string; start: number; end: number; standing: string }[]>();

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;
    const startTimeStr = data.startTime;
    
    // Skip games without start time
    if (!startTimeStr) continue;

    const fieldId = getFieldId(data, node.parentId);
    if (!fieldId) continue;

    try {
      const startMinutes = parseTime(startTimeStr);
      const duration = data.duration || DEFAULT_GAME_DURATION;
      const endMinutes = startMinutes + duration;

      if (!gamesByField.has(fieldId)) {
        gamesByField.set(fieldId, []);
      }
      gamesByField.get(fieldId)!.push({
        id: node.id,
        start: startMinutes,
        end: endMinutes,
        standing: data.standing || node.id
      });
    } catch {
      // Ignore invalid time formats (handled by other validation or UI)
      continue;
    }
  }

  // Check for overlaps in each field
  for (const [fieldId, games] of gamesByField) {
    // Sort by start time
    games.sort((a, b) => a.start - b.start);

    for (let i = 0; i < games.length - 1; i++) {
      const current = games[i];
      const next = games[i + 1];

      // Check overlap: if next game starts before current game ends
      // Note: We use < because if next starts exactly when current ends, it's NOT an overlap
      if (next.start < current.end) {
        let fieldName = fields.find(f => f.id === fieldId)?.name;
        
        // If not found in fields array, look in nodes (v2 model)
        if (!fieldName) {
          const fieldNode = nodes.find(n => n.id === fieldId && isFieldNode(n)) as FieldNode | undefined;
          if (fieldNode) {
            fieldName = fieldNode.data.name;
          }
        }

        if (!fieldName) {
          fieldName = 'Unknown Field';
        }
        
        errors.push({
          id: `overlap_${current.id}_${next.id}`,
          type: 'field_overlap',
          message: `Game "${current.standing}" overlaps with "${next.standing}" on field "${fieldName}"`,
          messageKey: 'field_overlap',
          messageParams: {
            game1: current.standing,
            game2: next.standing,
            field: fieldName
          },
          affectedNodes: [current.id, next.id],
        });
      }
    }
  }

  return errors;
}

/**
 * Check for team capacity conflicts (Phase 3).
 * Detects if a team is scheduled to play multiple games at the same time.
 */
function checkTeamCapacity(
  nodes: FlowNode[],
  globalTeams: GlobalTeam[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const gameNodes = nodes.filter(isGameNode);
  const teamMap = new Map(globalTeams.map(t => [t.id, t]));

  // Group games by team ID
  const gamesByTeam = new Map<string, { id: string; start: number; end: number; standing: string }[]>();

  for (const node of gameNodes) {
    const data = node.data as GameNodeData;
    const startTimeStr = data.startTime;
    
    // Skip games without start time
    if (!startTimeStr) continue;

    try {
      const startMinutes = parseTime(startTimeStr);
      const duration = data.duration || DEFAULT_GAME_DURATION;
      const endMinutes = startMinutes + duration;

      const gameInfo = {
        id: node.id,
        start: startMinutes,
        end: endMinutes,
        standing: data.standing || node.id
      };

      const participatingTeams = new Set<string>();
      if (data.homeTeamId) participatingTeams.add(data.homeTeamId);
      if (data.awayTeamId) participatingTeams.add(data.awayTeamId);
      
      // Check official (if it's a team ID)
      if (data.official && typeof data.official === 'string') {
        // Simple check: is it in our global teams list?
        if (teamMap.has(data.official)) {
          participatingTeams.add(data.official);
        }
      }

      participatingTeams.forEach(teamId => {
        if (!gamesByTeam.has(teamId)) {
          gamesByTeam.set(teamId, []);
        }
        gamesByTeam.get(teamId)!.push(gameInfo);
      });

    } catch {
      continue;
    }
  }

  // Check for overlaps for each team
  for (const [teamId, games] of gamesByTeam) {
    // Need at least 2 games to have an overlap
    if (games.length < 2) continue;

    // Sort by start time
    games.sort((a, b) => a.start - b.start);

    for (let i = 0; i < games.length - 1; i++) {
      const current = games[i];
      const next = games[i + 1];

      // Check overlap: if next game starts before current game ends
      if (next.start < current.end) {
        const teamName = teamMap.get(teamId)?.label || 'Unknown Team';
        
        errors.push({
          id: `capacity_${teamId}_${current.id}_${next.id}`,
          type: 'team_overlap',
          message: `Team "${teamName}" is scheduled in overlapping games: "${current.standing}" and "${next.standing}"`,
          messageKey: 'team_overlap',
          messageParams: {
            team: teamName,
            game1: current.standing,
            game2: next.standing
          },
          affectedNodes: [current.id, next.id],
        });
      }
    }
  }

  return errors;
}

/**
 * Check for logical stage sequence (Phase 3).
 * Ensures stages follow a logical time order if times are set.
 */
function checkStageSequence(
  nodes: FlowNode[]
): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];
  const stageNodes = nodes.filter(isStageNode);

  // Group stages by field
  const stagesByField = new Map<string, FlowNode[]>();
  for (const node of stageNodes) {
    if (node.parentId) {
      const fieldStages = stagesByField.get(node.parentId) || [];
      fieldStages.push(node);
      stagesByField.set(node.parentId, fieldStages);
    }
  }

  for (const stages of stagesByField.values()) {
    // Sort by order within field
    stages.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

    for (let i = 0; i < stages.length - 1; i++) {
      const current = stages[i];
      const next = stages[i + 1];

      // 1. Check category progression (preliminary -> final -> placement)
      const categoryOrder: Record<string, number> = {
        'preliminary': 0,
        'final': 1,
        'placement': 2,
        'custom': 3
      };

      if (categoryOrder[next.data.category] < categoryOrder[current.data.category]) {
        warnings.push({
          id: `stage_sequence_type_${current.id}_${next.id}`,
          type: 'stage_sequence_type',
          message: `Stage "${next.data.name}" (${next.data.category}) follows "${current.data.name}" (${current.data.category}) which might be out of order`,
          messageKey: 'stage_sequence_type',
          messageParams: {
            stage1: current.data.name,
            type1: current.data.category,
            stage2: next.data.name,
            type2: next.data.category
          },
          affectedNodes: [current.id, next.id],
        });
      }

      // 2. Check start times if both are set
      if (current.data.startTime && next.data.startTime) {
        try {
          const currentTime = parseTime(current.data.startTime);
          const nextTime = parseTime(next.data.startTime);
          
          if (nextTime < currentTime) {
            warnings.push({
              id: `stage_sequence_time_${current.id}_${next.id}`,
              type: 'stage_time_conflict',
              message: `Stage "${next.data.name}" starts at ${next.data.startTime}, which is before preceding stage "${current.data.name}" starts (${current.data.startTime})`,
              messageKey: 'stage_sequence_time',
              messageParams: {
                stage1: current.data.name,
                time1: current.data.startTime,
                stage2: next.data.name,
                time2: next.data.startTime
              },
              affectedNodes: [current.id, next.id],
            });
          }
        } catch {
          // Ignore invalid time formats
        }
      }
    }
  }

  return warnings;
}

/**
 * Check for cyclic stage references (Ranking Stages).
 */
function checkCyclicStageReferences(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const stageNodes = nodes.filter(isStageNode);

  for (const edge of edges) {
    if (!isStageToGameEdge(edge)) continue;

    const sourceStageId = edge.source;
    const targetGameId = edge.target;
    
    // Find target game's parent stage
    const targetGame = nodes.find(n => n.id === targetGameId);
    if (!targetGame || !targetGame.parentId) continue;

    if (sourceStageId === targetGame.parentId) {
      const stage = stageNodes.find(s => s.id === sourceStageId);
      errors.push({
        id: `cyclic_stage_ref_${edge.id}`,
        type: 'circular_dependency',
        message: `Stage "${stage?.data.name}" cannot reference its own ranking`,
        messageKey: 'circular_dependency',
        messageParams: {
          path: stage?.data.name || sourceStageId
        },
        affectedNodes: [sourceStageId, targetGameId],
      });
    }
  }

  return errors;
}

/**
 * Check for progression integrity (Phase 3).
 * Verifies that winner/loser paths and rank paths are valid and complete.
 */
function checkProgressionIntegrity(
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const gameNodes = nodes.filter(isGameNode);
  const stageNodes = nodes.filter(isStageNode);

  // Map to find stage for each node
  const nodeToStage = new Map<string, FlowNode>();
  for (const node of gameNodes) {
    if (node.parentId) {
      const stage = stageNodes.find(s => s.id === node.parentId);
      if (stage) {
        nodeToStage.set(node.id, stage);
      }
    }
  }

  // Check each edge for logical progression
  for (const edge of edges) {
    let sourceStage: FlowNode | undefined;
    let targetStage: FlowNode | undefined;
    let sourceName: string = '';
    let targetName: string = '';

    if (isGameToGameEdge(edge)) {
      sourceStage = nodeToStage.get(edge.source);
      targetStage = nodeToStage.get(edge.target);
      const sourceGame = gameNodes.find(n => n.id === edge.source);
      const targetGame = gameNodes.find(n => n.id === edge.target);
      sourceName = sourceGame?.data.standing || edge.source;
      targetName = targetGame?.data.standing || edge.target;
    } else if (isStageToGameEdge(edge)) {
      sourceStage = stageNodes.find(s => s.id === edge.source);
      targetStage = stageNodes.find(s => s.id === (nodes.find(n => n.id === edge.target)?.parentId));
      const targetGame = gameNodes.find(n => n.id === edge.target);
      sourceName = sourceStage?.data.name || edge.source;
      targetName = targetGame?.data.standing || edge.target;
    }

    if (sourceStage && targetStage) {
      // Progression should go to a stage with same or higher order
      if (targetStage.data.order < sourceStage.data.order) {
        errors.push({
          id: `progression_order_${edge.id}`,
          type: 'progression_order',
          message: `Progression from "${sourceName}" (${sourceStage.data.name}) to earlier stage "${targetStage.data.name}"`,
          messageKey: 'progression_order',
          messageParams: {
            sourceGame: sourceName,
            sourceStage: sourceStage.data.name,
            targetGame: targetName,
            targetStage: targetStage.data.name
          },
          affectedNodes: [edge.source, edge.target],
        });
      }
    }
  }

  return errors;
}

/**
 * Check for uneven game distribution (Phase 3).
 * Warns if teams in a group have significantly different game counts.
 */
function checkUnevenGames(
  nodes: FlowNode[],
  globalTeams: GlobalTeam[],
  globalTeamGroups: GlobalTeamGroup[]
): FlowValidationWarning[] {
  const warnings: FlowValidationWarning[] = [];
  const gameNodes = nodes.filter(isGameNode);

  // Group teams by their group ID
  const teamsByGroup = new Map<string, string[]>();
  for (const team of globalTeams) {
    if (team.groupId) {
      const groupTeams = teamsByGroup.get(team.groupId) || [];
      groupTeams.push(team.id);
      teamsByGroup.set(team.groupId, groupTeams);
    }
  }

  // Count games for each team
  const gameCounts = new Map<string, number>();
  for (const node of gameNodes) {
    const data = node.data as GameNodeData;
    if (data.homeTeamId) {
      gameCounts.set(data.homeTeamId, (gameCounts.get(data.homeTeamId) || 0) + 1);
    }
    if (data.awayTeamId) {
      gameCounts.set(data.awayTeamId, (gameCounts.get(data.awayTeamId) || 0) + 1);
    }
  }

  // Check each group for uneven distribution
  for (const [groupId, teamIds] of teamsByGroup) {
    if (teamIds.length < 2) continue;

    const counts = teamIds.map(id => gameCounts.get(id) || 0);
    const minGames = Math.min(...counts);
    const maxGames = Math.max(...counts);

    // If there's any difference in game counts within a group, warn
    if (minGames !== maxGames) {
      const groupName = globalTeamGroups.find(g => g.id === groupId)?.name || 'Unknown Group';
      
      warnings.push({
        id: `uneven_distribution_${groupId}`,
        type: 'uneven_game_distribution',
        message: `Group "${groupName}" has uneven game distribution (min: ${minGames}, max: ${maxGames})`,
        messageKey: 'uneven_game_distribution',
        messageParams: {
          group: groupName,
          minGames,
          maxGames
        },
        affectedNodes: [], // Groups don't have nodes directly
      });
    }
  }

  return warnings;
}

/**
 * useFlowValidation hook.
 *
 * Validates the flowchart and returns errors and warnings.
 *
 * @param nodes - The nodes to validate
 * @param edges - The edges to validate
 * @param fields - All fields in the tournament
 * @param globalTeams - Global team pool
 * @param globalTeamGroups - Team groups
 * @returns Validation result with errors and warnings
 */
export function useFlowValidation(
  nodes: FlowNode[],
  edges: FlowEdge[],
  fields: FlowField[] = [],
  globalTeams: GlobalTeam[] = [],
  globalTeamGroups: GlobalTeamGroup[] = []
): FlowValidationResult {
  return useMemo(() => {
    const errors: FlowValidationError[] = [
      ...checkIncompleteInputs(nodes, edges),
      ...checkCircularDependencies(nodes, edges),
      ...checkOfficialPlaying(nodes, edges, globalTeams),
      ...checkStagesOutsideFields(nodes),
      ...checkGamesOutsideContainers(nodes),
      ...checkTeamsOutsideContainers(nodes),
      ...checkTimeOverlaps(nodes, fields),
      ...checkTeamCapacity(nodes, globalTeams),
      ...checkProgressionIntegrity(nodes, edges),
      ...checkCyclicStageReferences(nodes, edges),
    ];

    const warnings: FlowValidationWarning[] = [
      ...checkDuplicateStandings(nodes),
      ...checkOrphanedTeams(nodes, edges),
      ...checkUnassignedFields(nodes),
      ...checkStageSequence(nodes),
      ...checkUnevenGames(nodes, globalTeams, globalTeamGroups),
    ];

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [nodes, edges, fields, globalTeams, globalTeamGroups]);
}
