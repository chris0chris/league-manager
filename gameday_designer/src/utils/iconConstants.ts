/**
 * Centralized icon constants for the Gameday Designer.
 * Using Bootstrap Icons (bi-*).
 */

export const ICONS = {
  // Main Entities
  GAMEDAY: 'bi-calendar2-range',
  FIELD: 'bi-map',
  STAGE: 'bi-layers',
  GAME: 'bi-pennant-fill',
  TEAM: 'bi-people-fill',
  OFFICIAL: 'bi-person-badge-fill',
  
  // Actions
  ADD: 'bi-plus-circle',
  EDIT: 'bi-pencil-square',
  DELETE: 'bi-trash3',
  SAVE: 'bi-check-lg',
  CANCEL: 'bi-x-lg',
  CLEAR: 'bi-arrow-counterclockwise',
  IMPORT: 'bi-upload',
  EXPORT: 'bi-download',
  REORDER_UP: 'bi-arrow-up',
  REORDER_DOWN: 'bi-arrow-down',
  GENERATE: 'bi-magic',
  TOURNAMENT: 'bi-trophy',
  
  // UI State
  EXPANDED: 'bi-chevron-down',
  COLLAPSED: 'bi-chevron-right',
  VALID: 'bi-check-circle-fill',
  ERROR: 'bi-x-circle-fill',
  WARNING: 'bi-exclamation-triangle-fill',
  INFO: 'bi-info-circle-fill',
  HELP: 'bi-question-circle',
  
  // Special
  TIME: 'bi-clock',
  LOCATION: 'bi-map',
  FOLDER: 'bi-folder-fill',
  PENCIL_SMALL: 'bi-pencil-fill',
} as const;

export type IconType = keyof typeof ICONS;
