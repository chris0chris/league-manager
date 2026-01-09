/**
 * Core types for the Gameday Designer
 *
 * These types represent the data model for creating and managing
 * flag football gameday schedules with support for various team
 * reference formats.
 */

/**
 * Team reference using group and team index format.
 * Example: { type: 'groupTeam', group: 0, team: 1 } represents "0_1"
 */
export interface GroupTeamReference {
  type: 'groupTeam';
  group: number;
  team: number;
}

/**
 * Team reference using standing/placement format.
 * Example: { type: 'standing', place: 2, groupName: 'Gruppe 1' } represents "P2 Gruppe 1"
 */
export interface StandingReference {
  type: 'standing';
  place: number;
  groupName: string;
}

/**
 * Team reference for winners of a match.
 * Example: { type: 'winner', matchName: 'HF1' } represents "Gewinner HF1"
 */
export interface WinnerReference {
  type: 'winner';
  matchName: string;
}

/**
 * Team reference for losers of a match.
 * Example: { type: 'loser', matchName: 'Spiel 3' } represents "Verlierer Spiel 3"
 */
export interface LoserReference {
  type: 'loser';
  matchName: string;
}

/**
 * Static team reference using a direct name.
 * Example: { type: 'static', name: 'Team Officials' }
 */
export interface StaticReference {
  type: 'static';
  name: string;
}

/**
 * Union type for all supported team reference formats.
 * Used throughout the designer for home, away, and official team assignments.
 */
export type TeamReference =
  | GroupTeamReference
  | StandingReference
  | WinnerReference
  | LoserReference
  | StaticReference;

/**
 * Represents a single game slot within a field.
 * Contains all the information needed to define a match.
 */
export interface GameSlot {
  /** Unique identifier for the game slot */
  id: string;
  /** Tournament stage: "Vorrunde", "Finalrunde", or custom */
  stage: string;
  /** Standing/match identifier: e.g., "Gruppe 1", "HF1", "P1", "Spiel 3" */
  standing: string;
  /** Home team reference */
  home: TeamReference;
  /** Away team reference */
  away: TeamReference;
  /** Officiating team reference */
  official: TeamReference;
  /** Extra break time after this game in minutes (default 0) */
  breakAfter: number;
}

/**
 * Represents a playing field with its assigned games.
 */
export interface Field {
  /** Unique identifier for the field */
  id: string;
  /** Display name (e.g., "Feld 1", "Main Field") */
  name: string;
  /** Display order for sorting fields */
  order: number;
  /** Games assigned to this field, in play order */
  gameSlots: GameSlot[];
}

/**
 * Validation error types
 */
export type ValidationErrorType =
  | 'official_playing'
  | 'invalid_reference'
  | 'circular_dependency';

/**
 * Validation warning types
 */
export type ValidationWarningType = 'consecutive_games' | 'duplicate_standing';

/**
 * Represents a validation error found in the schedule.
 */
export interface ValidationError {
  /** Unique identifier for this error */
  id: string;
  /** Type of validation error */
  type: ValidationErrorType;
  /** Human-readable error message */
  message: string;
  /** Translation key for the error message */
  messageKey?: string;
  /** Parameters for the translation key */
  messageParams?: Record<string, unknown>;
  /** IDs of affected game slots */
  affectedSlots: string[];
}

/**
 * Represents a validation warning found in the schedule.
 */
export interface ValidationWarning {
  /** Unique identifier for this warning */
  id: string;
  /** Type of validation warning */
  type: ValidationWarningType;
  /** Human-readable warning message */
  message: string;
  /** Translation key for the warning message */
  messageKey?: string;
  /** Parameters for the translation key */
  messageParams?: Record<string, unknown>;
  /** IDs of affected game slots */
  affectedSlots: string[];
}

/**
 * Result of validating the current schedule state.
 */
export interface ValidationResult {
  /** Whether the schedule is valid (no errors) */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Notification types for user feedback.
 */
export type NotificationType = 'success' | 'danger' | 'warning' | 'info';

/**
 * Represents a notification to be displayed to the user.
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** Message to display */
  message: string;
  /** Type of notification (determines styling) */
  type: NotificationType;
  /** Whether the notification is visible */
  show: boolean;
  /** Optional title for the notification */
  title?: string;
}

/**
 * Main state for the designer application.
 */
export interface DesignerState {
  /** All fields in the schedule */
  fields: Field[];
  /** ID of currently selected game slot for editing (null if none) */
  selectedGameSlot: string | null;
  /** Current validation results */
  validationResult: ValidationResult;
}

/**
 * JSON format for a single game as used in schedule_*.json files.
 * This matches the existing format used by schedule_manager.py.
 */
export interface GameJson {
  /** Tournament stage */
  stage: string;
  /** Standing/match identifier */
  standing: string;
  /** Home team reference string */
  home: string;
  /** Away team reference string */
  away: string;
  /** Official team reference string */
  official: string;
  /** Optional break time after game */
  break_after?: number;
}

/**
 * JSON format for a field schedule as used in schedule_*.json files.
 * This matches the existing format used by schedule_manager.py.
 */
export interface ScheduleJson {
  /** Field identifier (can be string or number) */
  field: string | number;
  /** Games on this field */
  games: GameJson[];
}

/**
 * Type guard to check if a team reference is a GroupTeamReference
 */
export function isGroupTeamReference(
  ref: TeamReference
): ref is GroupTeamReference {
  return ref.type === 'groupTeam';
}

/**
 * Type guard to check if a team reference is a StandingReference
 */
export function isStandingReference(
  ref: TeamReference
): ref is StandingReference {
  return ref.type === 'standing';
}

/**
 * Type guard to check if a team reference is a WinnerReference
 */
export function isWinnerReference(ref: TeamReference): ref is WinnerReference {
  return ref.type === 'winner';
}

/**
 * Type guard to check if a team reference is a LoserReference
 */
export function isLoserReference(ref: TeamReference): ref is LoserReference {
  return ref.type === 'loser';
}

/**
 * Type guard to check if a team reference is a StaticReference
 */
export function isStaticReference(ref: TeamReference): ref is StaticReference {
  return ref.type === 'static';
}

/**
 * Creates an empty validation result.
 */
export function createEmptyValidationResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Creates an initial empty designer state.
 */
export function createInitialDesignerState(): DesignerState {
  return {
    fields: [],
    selectedGameSlot: null,
    validationResult: createEmptyValidationResult(),
  };
}

/**
 * Creates a default team reference (static empty).
 */
export function createDefaultTeamReference(): TeamReference {
  return { type: 'static', name: '' };
}

/**
 * Creates a new game slot with default values.
 */
export function createDefaultGameSlot(id: string): GameSlot {
  return {
    id,
    stage: 'Vorrunde',
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
