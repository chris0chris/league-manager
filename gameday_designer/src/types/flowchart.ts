/**
 * Flowchart Types for the Gameday Designer
 *
 * These types define the node-based structure for designing
 * tournament schedules. Previously used with React Flow, now used
 * with list-based UI.
 */

import type { TeamReference } from './designer';
import { DEFAULT_GAME_DURATION } from '../utils/tournamentConstants';

// ============================================================================
// Global Team Pool (v2)
// ============================================================================

/**
 * Global team pool entry - represents a reusable team.
 * Teams are created once and can be assigned to multiple games.
 */
export interface GlobalTeam {
  /** Unique identifier */
  id: string;
  /** Display label for the team */
  label: string;
  /** Optional group assignment (null if ungrouped) */
  groupId: string | null;
  /** Order for display in global list (user-managed) */
  order: number;
  /** Optional color for visual coding */
  color?: string;
}

/**
 * Global team group - for organizing teams into collapsible sections.
 * Teams can optionally belong to a group.
 */
export interface GlobalTeamGroup {
  /** Unique identifier */
  id: string;
  /** Display name for the group */
  name: string;
  /** Optional color for visual coding */
  color?: string;
  /** Display order (user-managed) */
  order: number;
}

// ============================================================================
// Base Node and Edge Types (previously from React Flow)
// ============================================================================

/**
 * Base node type (replaces React Flow Node).
 */
export interface Node<T = Record<string, unknown>, U extends string = string> {
  id: string;
  type: U;
  position: { x: number; y: number };
  data: T;
  parentId?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  selectable?: boolean;
  extent?: 'parent' | [number, number, number, number];
  expandParent?: boolean;
}

/**
 * Base edge type (replaces React Flow Edge).
 */
export interface Edge<T = Record<string, unknown>> {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: T;
}

// ============================================================================
// Node Data Types
// ============================================================================

/**
 * Data for a team node - represents a team as an entry point to the tournament.
 */
export interface TeamNodeData {
  /** Node type discriminator */
  type: 'team';
  /** The team reference (groupTeam, standing, static) */
  reference: TeamReference;
  /** Display label for the node */
  label: string;
}

/**
 * Data for a game node - represents a match with team inputs and result outputs.
 */
export interface GameNodeData {
  /** Node type discriminator */
  type: 'game';
  /** Tournament stage: "Preliminary", "Final", or custom */
  stage: string;
  /** Stage type discriminator: "STANDARD" or "RANKING" */
  stageType: 'STANDARD' | 'RANKING';
  /** Standing/match identifier: e.g., "HF1", "P1", "Spiel 3" */
  standing: string;
  /** Assigned field ID (null if unassigned) - deprecated in v2, use parentId hierarchy */
  fieldId: string | null;
  /** Officiating team reference (can be null) */
  official: TeamReference | null;
  /** Extra break time after this game in minutes */
  breakAfter: number;

  // Team assignments (v2 - global team pool)
  /** Home team assignment (references GlobalTeam.id) */
  homeTeamId: string | null;
  /** Away team assignment (references GlobalTeam.id) */
  awayTeamId: string | null;
  /** Dynamic home team reference from GameToGameEdge (overrides homeTeamId) */
  homeTeamDynamic: TeamReference | null;
  /** Dynamic away team reference from GameToGameEdge (overrides awayTeamId) */
  awayTeamDynamic: TeamReference | null;

  /** Resolved home team label from backend (read-only) */
  resolvedHomeTeam?: string;
  /** Resolved away team label from backend (read-only) */
  resolvedAwayTeam?: string;

  // Time scheduling (Phase 1)
  /** Calculated start time (HH:MM, 24-hour). Auto-calculated or manual. */
  startTime?: string;
  /** Game duration in minutes (default 50) */
  duration?: number;
  /** Flag: true if startTime was manually set (prevents auto-recalc) */
  manualTime?: boolean;
}

// ============================================================================
// Container Node Data Types (v2)
// ============================================================================

/**
 * Stage category enumeration for ordering stages within a field.
 */
export type StageCategory = 'preliminary' | 'final' | 'placement' | 'custom';

/**
 * Stage type discriminator for ranking logic.
 */
export type StageType = 'STANDARD' | 'RANKING';

/**
 * Progression mode for game generation templates (Phase 2).
 * - manual: No templates (default) - all games added manually
 * - round_robin: Group stage with round robin matchups
 * - placement: Placement rounds (e.g., 1st-4th place)
 */
export type ProgressionMode =
  | 'manual'         // No templates (default)
  | 'round_robin'    // Group stage
  | 'placement';     // Placement rounds

/**
 * Configuration for Round Robin progression mode.
 */
export interface RoundRobinConfig {
  mode: 'round_robin';
  /** Number of teams in the round robin */
  teamCount: number;
  /** Whether to play double round robin (home and away) */
  doubleRound: boolean;
}

/**
 * Configuration for Placement progression mode.
 */
export interface PlacementConfig {
  mode: 'placement';
  /** Number of positions to determine (e.g., 4 for 1st-4th place) */
  positions: number;
  /** Format for placement games */
  format: 'single_elimination' | 'crossover';
}

/**
 * Configuration for Manual progression mode (no templates).
 */
export interface ManualConfig {
  mode: 'manual';
}

/**
 * Union type for all progression configurations.
 */
export type ProgressionConfig = ManualConfig | RoundRobinConfig | PlacementConfig;

/**
 * Data for a field container node - represents a playing field.
 * Fields are top-level containers that hold stages.
 */
export interface FieldNodeData {
  /** Node type discriminator */
  type: 'field';
  /** Display name (e.g., "Feld 1", "Main Field") */
  name: string;
  /** Display order for sorting fields */
  order: number;
  /** Optional color for visual coding */
  color?: string;
}

/**
 * Data for a stage container node - represents a tournament phase.
 * Stages are nested within fields and contain games.
 */
export interface StageNodeData {
  /** Node type discriminator */
  type: 'stage';
  /** Display name (e.g., "Preliminary", "Final") */
  name: string;
  /** Stage category for ordering */
  category: StageCategory;
  /** Stage type discriminator for ranking logic */
  stageType: StageType;
  /** Order within parent field */
  order: number;
  /** Optional color for visual coding */
  color?: string;

  // Time scheduling (Phase 1)
  /** Start time for first game in stage (HH:MM, 24-hour) */
  startTime?: string;
  /** Default game duration for stage in minutes (default 50) */
  defaultGameDuration?: number;
  /** Default break between games in minutes (default 0) */
  defaultBreakBetweenGames?: number;

  // Progression types (Phase 2)
  /** Progression mode for game generation */
  progressionMode?: ProgressionMode;
  /** Configuration for progression mode */
  progressionConfig?: ProgressionConfig;
  /** Optional mapping for progression from source games */
  progressionMapping?: Record<string, {
    home: { sourceIndex: number; type: 'winner' | 'loser' };
    away: { sourceIndex: number; type: 'winner' | 'loser' };
  }>;
}

// ============================================================================
// Node Types
// ============================================================================

/**
 * Union type for all node data types.
 */
export type FlowNodeData = GameNodeData | FieldNodeData | StageNodeData;

/**
 * Team node type for React Flow.
 * @deprecated Teams are now managed in global team pool (v2)
 */
export type TeamNode = Node<TeamNodeData, 'team'>;

/**
 * Game node type for React Flow.
 */
export type GameNode = Node<GameNodeData, 'game'>;

/**
 * Field container node type for React Flow.
 * Fields are top-level containers that hold stages.
 */
export type FieldNode = Node<FieldNodeData, 'field'>;

/**
 * Stage container node type for React Flow.
 * Stages are nested within fields and contain games.
 */
export type StageNode = Node<StageNodeData, 'stage'>;

/**
 * Union type for all node types used in the designer.
 */
export type FlowNode = GameNode | FieldNode | StageNode;

// ============================================================================
// Edge Types
// ============================================================================

/**
 * Handle IDs for game node connections.
 */
export type GameInputHandle = 'home' | 'away';
export type GameOutputHandle = 'winner' | 'loser';
export type TeamOutputHandle = 'output';

/**
 * Handle IDs for stage node connections (Ranking Stages).
 * Format: rank-1, rank-2, etc.
 */
export type RankOutputHandle = `rank-${number}`;

/**
 * Data for an edge connecting a team to a game input.
 */
export interface TeamToGameEdgeData {
  /** Target port on the game node */
  targetPort: GameInputHandle;
}

/**
 * Data for an edge connecting a game output to another game input.
 */
export interface GameToGameEdgeData {
  /** Source port on the source game node */
  sourcePort: GameOutputHandle;
  /** Target port on the target game node */
  targetPort: GameInputHandle;
}

/**
 * Data for an edge connecting a stage rank to a game input.
 */
export interface StageToGameEdgeData {
  /** Source rank on the source stage node (1-indexed) */
  sourceRank: number;
  /** Target port on the target game node */
  targetPort: GameInputHandle;
}

/**
 * Edge connecting a team node to a game node.
 * @deprecated Teams are now assigned directly to games via GlobalTeam pool (v2)
 */
export interface TeamToGameEdge extends Edge {
  type: 'teamToGame';
  sourceHandle: TeamOutputHandle;
  targetHandle: GameInputHandle;
  data: TeamToGameEdgeData;
}

/**
 * Edge connecting a game output to another game input.
 */
export interface GameToGameEdge extends Edge {
  type: 'gameToGame';
  sourceHandle: GameOutputHandle;
  targetHandle: GameInputHandle;
  data: GameToGameEdgeData;
}

/**
 * Edge connecting a stage node (Ranking Stage) to a game node.
 */
export interface StageToGameEdge extends Edge {
  type: 'stageToGame';
  sourceHandle: RankOutputHandle;
  targetHandle: GameInputHandle;
  data: StageToGameEdgeData;
}

/**
 * Union type for all edge types used in the designer.
 */
export type FlowEdge = GameToGameEdge | StageToGameEdge;

// ============================================================================
// Field Types (Simplified from slot-based approach)
// ============================================================================

/**
 * Represents a playing field (simplified - no gameSlots).
 */
export interface FlowField {
  /** Unique identifier for the field */
  id: string;
  /** Display name (e.g., "Feld 1", "Main Field") */
  name: string;
  /** Display order for sorting fields */
  order: number;
  /** Optional color for visual coding */
  color?: string;
}

// ============================================================================
// Gameday Metadata
// ============================================================================

/**
 * Gameday metadata for high-level management.
 */
export interface GamedayMetadata {
  id: number;
  name: string;
  date: string;
  start: string;
  format: string;
  author: number;
  author_display?: string;
  address: string;
  season: number;
  season_display?: string;
  league: number;
  league_display?: string;
  status: string;
}

// ============================================================================
// Flow State
// ============================================================================

/**
 * Complete state of the flowchart designer.
 */
export interface FlowState {
  /** Gameday metadata */
  metadata?: GamedayMetadata;
  /** All nodes in the graph */
  nodes: FlowNode[];
  /** All edges connecting nodes */
  edges: FlowEdge[];
  /** Available playing fields */
  fields: FlowField[];
  /** Global team pool (v2) - teams that can be assigned to any game */
  globalTeams: GlobalTeam[];
  /** Global team groups - for organizing teams into sections */
  globalTeamGroups: GlobalTeamGroup[];
}

// ============================================================================
// Selection and Highlighting State
// ============================================================================

/**
 * Represents an element that is currently visually highlighted.
 */
export interface HighlightedElement {
  /** ID of the element to highlight */
  id: string;
  /** Type of the element (for context-aware styling) */
  type: 'game' | 'stage' | 'field' | 'team';
}

/**
 * Represents what is currently selected in the canvas.
 */
export interface SelectionState {
  /** IDs of selected nodes */
  nodeIds: string[];
  /** IDs of selected edges */
  edgeIds: string[];
}

// ============================================================================
// Validation Types (Flow-specific)
// ============================================================================

/**
 * Validation error types for the flowchart approach.
 */
export type FlowValidationErrorType =
  | 'incomplete_game_inputs'
  | 'circular_dependency'
  | 'official_playing'
  | 'self_reference'
  | 'stage_outside_field'
  | 'team_outside_container'
  | 'game_outside_container'
  | 'field_overlap'
  | 'team_overlap'
  | 'progression_incomplete'
  | 'progression_order';

/**
 * Validation warning types for the flowchart approach.
 */
export type FlowValidationWarningType =
  | 'duplicate_standing'
  | 'orphaned_team'
  | 'unassigned_field'
  | 'stage_time_conflict'
  | 'stage_sequence_type'
  | 'uneven_game_distribution';

/**
 * Validation error for the flowchart.
 */
export interface FlowValidationError {
  /** Unique identifier for this error */
  id: string;
  /** Type of validation error */
  type: FlowValidationErrorType;
  /** Human-readable error message */
  message: string;
  /** Translation key for the error message */
  messageKey?: string;
  /** Parameters for the translation key */
  messageParams?: Record<string, unknown>;
  /** IDs of affected nodes */
  affectedNodes: string[];
}

/**
 * Validation warning for the flowchart.
 */
export interface FlowValidationWarning {
  /** Unique identifier for this warning */
  id: string;
  /** Type of validation warning */
  type: FlowValidationWarningType;
  /** Human-readable warning message */
  message: string;
  /** Translation key for the warning message */
  messageKey?: string;
  /** Parameters for the translation key */
  messageParams?: Record<string, unknown>;
  /** IDs of affected nodes */
  affectedNodes: string[];
}

/**
 * Result of validating the flowchart state.
 */
export interface FlowValidationResult {
  /** Whether the flowchart is valid (no errors) */
  isValid: boolean;
  /** List of validation errors */
  errors: FlowValidationError[];
  /** List of validation warnings */
  warnings: FlowValidationWarning[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if node data is TeamNodeData.
 */
export function isTeamNodeData(data: FlowNodeData): data is TeamNodeData {
  return data.type === 'team';
}

/**
 * Type guard to check if node data is GameNodeData.
 */
export function isGameNodeData(data: FlowNodeData): data is GameNodeData {
  return data.type === 'game';
}

/**
 * Type guard to check if node data is FieldNodeData.
 */
export function isFieldNodeData(data: FlowNodeData): data is FieldNodeData {
  return data.type === 'field';
}

/**
 * Type guard to check if node data is StageNodeData.
 */
export function isStageNodeData(data: FlowNodeData): data is StageNodeData {
  return data.type === 'stage';
}

/**
 * Type guard to check if a node is a TeamNode.
 */
export function isTeamNode(node: FlowNode): node is TeamNode {
  return node.type === 'team';
}

/**
 * Type guard to check if a node is a GameNode.
 */
export function isGameNode(node: FlowNode): node is GameNode {
  return node.type === 'game';
}

/**
 * Type guard to check if a node is a FieldNode.
 */
export function isFieldNode(node: FlowNode): node is FieldNode {
  return node.type === 'field';
}

/**
 * Type guard to check if a node is a StageNode.
 */
export function isStageNode(node: FlowNode): node is StageNode {
  return node.type === 'stage';
}

/**
 * Type guard to check if a node is a container (Field or Stage).
 */
export function isContainerNode(node: FlowNode): node is FieldNode | StageNode {
  return node.type === 'field' || node.type === 'stage';
}

/**
 * Type guard to check if an edge is a TeamToGameEdge.
 */
export function isTeamToGameEdge(edge: FlowEdge): edge is TeamToGameEdge {
  return edge.type === 'teamToGame';
}

/**
 * Type guard to check if an edge is a GameToGameEdge.
 */
export function isGameToGameEdge(edge: FlowEdge): edge is GameToGameEdge {
  return edge.type === 'gameToGame';
}

/**
 * Type guard to check if an edge is a StageToGameEdge.
 */
export function isStageToGameEdge(edge: FlowEdge): edge is StageToGameEdge {
  return edge.type === 'stageToGame';
}

// ============================================================================
// Factory Functions
// ============================================================================

// createTeamNode deleted - teams are now managed in global team pool (v2)

/**
 * Creates a new game node with default values.
 */
export function createGameNode(
  id: string,
  position: { x: number; y: number } = { x: 0, y: 0 },
  options: Partial<Omit<GameNodeData, 'type'>> = {}
): GameNode {
  return {
    id,
    type: 'game',
    position,
    data: {
      type: 'game',
      stage: options.stage ?? 'Preliminary',
      stageType: options.stageType ?? 'STANDARD',
      standing: options.standing ?? '',
      fieldId: options.fieldId ?? null,
      official: options.official ?? null,
      breakAfter: options.breakAfter ?? 0,
      // v2 team assignment fields
      homeTeamId: options.homeTeamId ?? null,
      awayTeamId: options.awayTeamId ?? null,
      homeTeamDynamic: options.homeTeamDynamic ?? null,
      awayTeamDynamic: options.awayTeamDynamic ?? null,
      // Time scheduling fields (Phase 1)
      duration: options.duration ?? DEFAULT_GAME_DURATION,
      startTime: options.startTime,
      manualTime: options.manualTime ?? false,
    },
  };
}

// ============================================================================
// Container Factory Functions (v2)
// ============================================================================

/**
 * Creates a new field container node.
 *
 * @param id - Unique identifier for the node
 * @param options - Optional field properties (name, order, color)
 * @param position - Canvas position (default: { x: 50, y: 50 })
 */
export function createFieldNode(
  id: string,
  options?: Partial<Omit<FieldNodeData, 'type'>>,
  position: { x: number; y: number } = { x: 50, y: 50 }
): FieldNode {
  return {
    id,
    type: 'field',
    position,
    data: {
      type: 'field',
      name: options?.name ?? 'Feld 1',
      order: options?.order ?? 0,
      ...(options?.color && { color: options.color }),
    },
    style: { width: 350, height: 300 },
    draggable: false,
    selectable: true,
  };
}

/**
 * Creates a new stage container node.
 *
 * @param id - Unique identifier for the node
 * @param parentId - Parent field node ID (required)
 * @param options - Optional stage properties (name, stageType, order)
 * @param position - Position relative to parent (default: { x: 20, y: 60 })
 */
export function createStageNode(
  id: string,
  parentId: string,
  options?: Partial<Omit<StageNodeData, 'type'>>,
  position: { x: number; y: number } = { x: 20, y: 60 }
): StageNode {
  return {
    id,
    type: 'stage',
    parentId,
    position,
    data: {
      type: 'stage',
      name: options?.name ?? 'Preliminary',
      category: options?.category ?? 'preliminary',
      stageType: options?.stageType ?? 'STANDARD',
      order: options?.order ?? 0,
      color: options?.color,
      // Time scheduling fields (Phase 1)
      startTime: options?.startTime,
      defaultGameDuration: options?.defaultGameDuration ?? DEFAULT_GAME_DURATION,
      defaultBreakBetweenGames: options?.defaultBreakBetweenGames ?? 0,
      // Progression fields (Phase 2)
      progressionMode: options?.progressionMode ?? 'manual',
      progressionConfig: options?.progressionConfig ?? { mode: 'manual' },
      progressionMapping: options?.progressionMapping,
    },
    style: { width: 300, height: 150 },
    extent: 'parent',
    expandParent: true,
    draggable: false,
    selectable: true,
  };
}

/**
 * Creates a new game node inside a stage container.
 *
 * @param id - Unique identifier for the node
 * @param parentId - Parent stage node ID (required)
 * @param options - Optional game properties
 * @param position - Position relative to parent (default: { x: 30, y: 50 })
 */
export function createGameNodeInStage(
  id: string,
  parentId: string,
  options?: Partial<Omit<GameNodeData, 'type'>>,
  position: { x: number; y: number } = { x: 30, y: 50 }
): GameNode {
  return {
    id,
    type: 'game',
    parentId,
    position,
    data: {
      type: 'game',
      stage: options?.stage ?? 'Preliminary',
      stageType: options?.stageType ?? 'STANDARD',
      standing: options?.standing ?? '',
      fieldId: options?.fieldId ?? null,
      official: options?.official ?? null,
      breakAfter: options?.breakAfter ?? 0,
      // v2 team assignment fields
      homeTeamId: options?.homeTeamId ?? null,
      awayTeamId: options?.awayTeamId ?? null,
      homeTeamDynamic: options?.homeTeamDynamic ?? null,
      awayTeamDynamic: options?.awayTeamDynamic ?? null,
      // Time scheduling fields (Phase 1)
      duration: options?.duration ?? DEFAULT_GAME_DURATION,
      startTime: options?.startTime,
      manualTime: options?.manualTime ?? false,
    },
    extent: 'parent',
    expandParent: true,
    draggable: false,
    selectable: true,
  };
}

// createTeamNodeInStage deleted - teams are now managed in global team pool (v2)

// createTeamToGameEdge deleted - teams are now assigned directly via GlobalTeam pool (v2)

/**
 * Creates a new game-to-game edge.
 */
export function createGameToGameEdge(
  id: string,
  sourceNodeId: string,
  sourcePort: GameOutputHandle,
  targetNodeId: string,
  targetPort: GameInputHandle
): GameToGameEdge {
  return {
    id,
    type: 'gameToGame',
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: sourcePort,
    targetHandle: targetPort,
    data: {
      sourcePort,
      targetPort,
    },
  };
}

/**
 * Creates a new stage-to-game edge.
 */
export function createStageToGameEdge(
  id: string,
  sourceStageId: string,
  sourceRank: number,
  targetGameId: string,
  targetPort: GameInputHandle
): StageToGameEdge {
  return {
    id,
    type: 'stageToGame',
    source: sourceStageId,
    target: targetGameId,
    sourceHandle: `rank-${sourceRank}`,
    targetHandle: targetPort,
    data: {
      sourceRank,
      targetPort,
    },
  };
}

/**
 * Creates a new field with default values.
 */
export function createFlowField(
  id: string,
  name: string,
  order: number
): FlowField {
  return {
    id,
    name,
    order,
  };
}

/**
 * Creates an empty flow state.
 */
export function createEmptyFlowState(): FlowState {
  return {
    metadata: {
      id: 0,
      name: '',
      date: new Date().toISOString().split('T')[0],
      start: '10:00',
      format: '6_2',
      author: 0,
      address: '',
      season: 0,
      league: 0,
      status: 'DRAFT',
    },
    nodes: [],
    edges: [],
    fields: [],
    globalTeams: [],
    globalTeamGroups: [],
  };
}

/**
 * Creates an empty validation result.
 */
export function createEmptyFlowValidationResult(): FlowValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}
