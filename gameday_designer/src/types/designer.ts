import { Node, Edge } from '@xyflow/react';

export type NotificationType = 'success' | 'danger' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
}

export interface Team {
  id: string;
  label: string;
  group?: string;
  color?: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  color?: string;
}

export interface TeamReference {
  type: 'static' | 'winner' | 'loser' | 'rank';
  name?: string;
  matchName?: string;
  stageName?: string;
  rank?: number;
}

export interface GameData extends Record<string, unknown> {
  standing: string;
  startTime: string;
  home: TeamReference;
  away: TeamReference;
  official: TeamReference;
  breakAfter: number;
  stage?: string;
  stageName?: string;
  fieldId?: string;
  halftime_score?: { home: number; away: number };
  final_score?: { home: number; away: number };
  resolvedHomeTeam?: string | null;
  resolvedAwayTeam?: string | null;
}

export interface StageData extends Record<string, unknown> {
  name: string;
  order: number;
  splitCount: number;
}

export interface FieldData extends Record<string, unknown> {
  name: string;
  order: number;
}

export type GameNode = Node<GameData, 'game'>;
export type StageNode = Node<StageData, 'stage'>;
export type FieldNode = Node<FieldData, 'field'>;

export type DesignerNode = GameNode | StageNode | FieldNode;

export function isGameNode(node: Node): node is GameNode {
  return node.type === 'game';
}

export function isStageNode(node: Node): node is StageNode {
  return node.type === 'stage';
}

export function isFieldNode(node: Node): node is FieldNode {
  return node.type === 'field';
}

export interface FlowState {
  nodes: DesignerNode[];
  edges: Edge[];
  globalTeams: Team[];
  globalTeamGroups: TeamGroup[];
}

export interface GameSlot {
  id: string;
  standing: string;
  home: TeamReference;
  away: TeamReference;
  official: TeamReference;
  breakAfter: number;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  splitCount: number;
  gameSlots: GameSlot[];
}

export interface Field {
  id: string;
  name: string;
  order: number;
  stages: Stage[];
}

export interface StructuredTemplate {
  version: string;
  fields: Field[];
  teams: Team[];
  teamGroups: TeamGroup[];
}

export interface HighlightedElement {
  id: string;
  type: 'node' | 'edge' | 'metadata';
}

/**
 * Creates a new team reference with default values.
 */
export function createDefaultTeamReference(): TeamReference {
  return {
    type: 'static',
    name: '',
  };
}

/**
 * Creates a new game slot with default values.
 */
export function createDefaultGameSlot(id: string): GameSlot {
  return {
    id,
    stage: 'Preliminary',
    standing: '',
    home: createDefaultTeamReference(),
    away: createDefaultTeamReference(),
    official: createDefaultTeamReference(),
    breakAfter: 0,
  };
}

/**
 * Creates a new field with default values.
 */
export function createDefaultField(id: string, order: number): Field {
  return {
    id,
    name: `Feld ${order + 1}`,
    order,
    gameSlots: [],
  };
}

/**
 * Game result input for a single team in a game.
 */
export interface GameResultInput {
  id: number;
  team: { id: number; name: string };
  fh: number | null;
  sh: number | null;
  isHome: boolean;
}

/**
 * Game results display showing all games and their results.
 */
export interface GameResultsDisplay {
  id: number;
  field: number;
  scheduled: string;
  status: string;
  results: GameResultInput[];
}
