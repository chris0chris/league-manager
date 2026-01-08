/**
 * Tournament Generation Constants
 *
 * Centralized constants for tournament bracket generation,
 * team assignment, and UI timing behaviors.
 *
 * @module tournamentConstants
 */

// ============================================================================
// Bracket Size Constants
// ============================================================================

/**
 * Bracket with only a final game (2 teams)
 */
export const BRACKET_SIZE_FINAL_ONLY = 2;

/**
 * Bracket with semifinals and final (4 teams)
 */
export const BRACKET_SIZE_WITH_SEMIFINALS = 4;

/**
 * Bracket with quarterfinals, semifinals, and final (8 teams)
 */
export const BRACKET_SIZE_WITH_QUARTERFINALS = 8;

// ============================================================================
// Minimum Team Requirements
// ============================================================================

/**
 * Minimum number of teams required for any bracket
 */
export const MIN_TEAMS_FOR_BRACKET = 2;

/**
 * Minimum number of teams required for semifinals bracket
 */
export const MIN_TEAMS_FOR_SEMIFINALS = 3;

/**
 * Minimum number of teams required for split group tournaments
 */
export const MIN_TEAMS_FOR_SPLIT_GROUPS = 6;

// ============================================================================
// Source Game Index Constants (for 2-group tournaments)
// ============================================================================

/**
 * Index of first place game in Group A
 */
export const GROUP_A_FIRST_GAME = 0;

/**
 * Index of second place game in Group A
 */
export const GROUP_A_SECOND_GAME = 1;

/**
 * Index of third place game in Group A
 */
export const GROUP_A_THIRD_GAME = 2;

/**
 * Index of first place game in Group B
 */
export const GROUP_B_FIRST_GAME = 3;

/**
 * Index of fourth place game in Group B (used in 6+ game patterns)
 */
export const GROUP_B_FOURTH_GAME = 4;

/**
 * Index of third place game in Group B
 */
export const GROUP_B_THIRD_GAME = 5;

// ============================================================================
// Array Offset Constants
// ============================================================================

/**
 * Offset to get the last element in an array (length - 1)
 */
export const LAST_GAME_OFFSET = 1;

/**
 * Offset to get the second-to-last element in an array (length - 2)
 */
export const SECOND_TO_LAST_GAME_OFFSET = 2;

// ============================================================================
// UI Timing Constants (milliseconds)
// ============================================================================

/**
 * Delay before auto-clearing highlighted source game (3 seconds)
 */
export const HIGHLIGHT_AUTO_CLEAR_DELAY = 3000;

/**
 * Delay after tournament generation before team assignment (500ms)
 * Allows state to settle before assigning teams
 */
export const TOURNAMENT_GENERATION_STATE_DELAY = 500;

/**
 * Delay before inspecting edges for debugging (100ms)
 */
export const EDGE_INSPECTION_DELAY = 100;

// ============================================================================
// Game Standing Labels
// ============================================================================

/**
 * Standing label for championship/final game
 */
export const GAME_STANDING_FINAL = 'Final';

/**
 * Standing label for third place game
 */
export const GAME_STANDING_THIRD_PLACE = '3rd Place';

/**
 * Standing label for first semifinal game
 */
export const GAME_STANDING_SF1 = 'SF1';

/**
 * Standing label for second semifinal game
 */
export const GAME_STANDING_SF2 = 'SF2';

/**
 * Standing label for first quarterfinal game
 */
export const GAME_STANDING_QF1 = 'QF1';

/**
 * Standing label for second quarterfinal game
 */
export const GAME_STANDING_QF2 = 'QF2';

/**
 * Standing label for third quarterfinal game
 */
export const GAME_STANDING_QF3 = 'QF3';

/**
 * Standing label for fourth quarterfinal game
 */
export const GAME_STANDING_QF4 = 'QF4';

/**
 * Standing label for first crossover game
 */
export const GAME_STANDING_CO1 = 'CO1';

/**
 * Standing label for second crossover game
 */
export const GAME_STANDING_CO2 = 'CO2';

// ============================================================================
// Team Generation Constants
// ============================================================================

/**
 * Default name for auto-generated tournament team group
 */
export const DEFAULT_TOURNAMENT_GROUP_NAME = 'Tournament Teams';

/**
 * Team color palette for auto-generated teams
 */
export const TEAM_COLORS = [
  '#3498db', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Turquoise
  '#e67e22', // Dark Orange
  '#34495e', // Dark Gray Blue
  '#16a085', // Dark Turquoise
  '#c0392b', // Dark Red
  '#27ae60', // Dark Green
  '#8e44ad', // Dark Purple
] as const;

// ============================================================================
// Default Gameday Settings
// ============================================================================

/**
 * Default start time for first game (10:00)
 */
export const DEFAULT_START_TIME = '10:00';

/**
 * Default game duration in minutes (70)
 */
export const DEFAULT_GAME_DURATION = 70;
