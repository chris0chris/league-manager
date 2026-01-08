/**
 * Tournament Types
 *
 * Type definitions for tournament template system.
 * Defines tournament formats that map team counts to complete tournament structures.
 */

import { StageType, ProgressionMode, ProgressionConfig } from './flowchart';

/**
 * Tournament format template definition
 */
export interface TournamentTemplate {
  /** Unique identifier (e.g., "F6-2-2", "F8-2-3") */
  id: string;

  /** Human-readable name (e.g., "6 Teams - 2 Groups of 3") */
  name: string;

  /** Team count requirements */
  teamCount: {
    min: number;
    max: number;
    exact?: number;
  };

  /** Available field count options user can select (e.g., [1, 2, 3]) */
  fieldOptions: number[];

  /** Stage templates defining tournament structure */
  stages: TournamentStageTemplate[];

  /** Timing configuration */
  timing: {
    /** Default start time for first game (HH:MM format) */
    firstGameStartTime: string;

    /** Default game duration in minutes */
    defaultGameDuration: number;

    /** Default break between games in minutes */
    defaultBreakBetweenGames: number;
  };
}

/**
 * Template for a single stage in a tournament
 */
export interface TournamentStageTemplate {
  /** Stage name (e.g., "Group Stage", "Semifinals") */
  name: string;

  /** Stage type (vorrunde, finalrunde, platzierung) */
  stageType: StageType;

  /** Progression mode (manual, round_robin, placement) */
  progressionMode: ProgressionMode;

  /** Progression configuration */
  config: ProgressionConfig;

  /**
   * Field assignment strategy:
   * - 'all': Create one stage per field (parallel execution)
   * - 'split': Divide groups across fields (Group A → Field 1, Group B → Field 2)
   * - number: Assign to specific field index
   */
  fieldAssignment: 'all' | 'split' | number;

  /**
   * Optional mapping for progression from source games.
   * Key is target game standing (e.g., 'SF1'), value is source mapping.
   */
  progressionMapping?: Record<string, {
    home: { sourceIndex: number; type: 'winner' | 'loser' };
    away: { sourceIndex: number; type: 'winner' | 'loser' };
  }>;
}

/**
 * Configuration for tournament generation
 */
export interface TournamentGenerationConfig {
  /** Selected tournament template */
  template: TournamentTemplate;

  /** Number of fields to create */
  fieldCount: number;

  /** Start time for first game (HH:MM format) */
  startTime: string;

  /** Optional: Override default game duration */
  gameDuration?: number;

  /** Optional: Override default break duration */
  breakDuration?: number;
}
