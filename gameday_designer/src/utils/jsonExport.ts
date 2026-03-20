/**
 * JSON Import/Export Utilities
 *
 * These utilities handle conversion between the internal DesignerState
 * and the JSON format used by schedule_*.json files, ensuring
 * compatibility with the existing schedule_manager.py.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DesignerState,
  Field,
  GameSlot,
  GameJson,
  ScheduleJson,
} from '../types/designer';
import { createEmptyValidationResult } from '../types/designer';
import { formatTeamReference, parseTeamReference } from './teamReference';

/**
 * Result of validating schedule JSON input.
 */
export interface ValidationResult {
  /** Whether the JSON is valid */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
}

/**
 * Exports the designer state to JSON format compatible with schedule_*.json files.
 *
 * @param state - The designer state to export
 * @returns Array of ScheduleJson objects, one per field
 *
 * @example
 * const json = exportToJson(state);
 * const jsonString = JSON.stringify(json, null, 2);
 */
export function exportToJson(state: DesignerState): ScheduleJson[] {
  return state.fields.map((field) => exportField(field));
}

/**
 * Exports a single field to its JSON representation.
 */
function exportField(field: Field): ScheduleJson {
  return {
    field: field.name,
    games: field.gameSlots.map((slot) => exportGameSlot(slot)),
  };
}

/**
 * Exports a single game slot to its JSON representation.
 */
function exportGameSlot(slot: GameSlot): GameJson {
  const game: GameJson = {
    stage: slot.stage,
    standing: slot.standing,
    home: formatTeamReference(slot.home),
    away: formatTeamReference(slot.away),
    official: formatTeamReference(slot.official),
  };

  // Only include break_after if it's non-zero
  if (slot.breakAfter > 0) {
    game.break_after = slot.breakAfter;
  }

  return game;
}

/**
 * Imports schedule JSON into a designer state.
 *
 * @param json - Array of ScheduleJson objects to import
 * @returns A new DesignerState initialized from the JSON
 *
 * @example
 * const json = JSON.parse(fileContent);
 * const state = importFromJson(json);
 * setState(state);
 */
export function importFromJson(json: ScheduleJson[]): DesignerState {
  const fields: Field[] = json.map((fieldJson, index) =>
    importField(fieldJson, index)
  );

  return {
    fields,
    selectedGameSlot: null,
    validationResult: createEmptyValidationResult(),
  };
}

/**
 * Imports a single field from its JSON representation.
 */
function importField(fieldJson: ScheduleJson, order: number): Field {
  // Handle both string and number field names
  const fieldName = String(fieldJson.field);

  return {
    id: uuidv4(),
    name: fieldName,
    order,
    gameSlots: fieldJson.games.map((gameJson) => importGameSlot(gameJson)),
  };
}

/**
 * Imports a single game slot from its JSON representation.
 */
function importGameSlot(gameJson: GameJson): GameSlot {
  return {
    id: uuidv4(),
    stage: gameJson.stage,
    standing: gameJson.standing,
    home: parseTeamReference(gameJson.home),
    away: parseTeamReference(gameJson.away),
    official: parseTeamReference(gameJson.official),
    breakAfter: gameJson.break_after ?? 0,
  };
}

/**
 * Validates that the input JSON is well-formed for import.
 *
 * @param json - The JSON to validate
 * @returns Validation result with any error messages
 *
 * @example
 * const result = validateScheduleJson(json);
 * if (!result.valid) {
 *   console.error('Invalid JSON:', result.errors);
 * }
 */
export function validateScheduleJson(json: unknown): ValidationResult {
  const errors: string[] = [];

  // Must be an array
  if (!Array.isArray(json)) {
    return { valid: false, errors: ['Input must be an array'] };
  }

  // Validate each field entry
  json.forEach((entry, fieldIndex) => {
    const fieldPrefix = `Field ${fieldIndex + 1}`;

    // Check for field property
    if (entry === null || typeof entry !== 'object') {
      errors.push(`${fieldPrefix}: Entry must be an object`);
      return;
    }

    const fieldEntry = entry as Record<string, unknown>;

    if (!('field' in fieldEntry)) {
      errors.push(`${fieldPrefix}: Missing 'field' property`);
    }

    // Check for games property
    if (!('games' in fieldEntry)) {
      errors.push(`${fieldPrefix}: Missing 'games' property`);
      return;
    }

    if (!Array.isArray(fieldEntry.games)) {
      errors.push(`${fieldPrefix}: 'games' must be an array`);
      return;
    }

    // Validate each game
    (fieldEntry.games as unknown[]).forEach((game, gameIndex) => {
      const gamePrefix = `${fieldPrefix}, Game ${gameIndex + 1}`;

      if (game === null || typeof game !== 'object') {
        errors.push(`${gamePrefix}: Game must be an object`);
        return;
      }

      const gameObj = game as Record<string, unknown>;

      // Check required properties
      const requiredProps = ['stage', 'standing', 'home', 'away', 'official'];
      for (const prop of requiredProps) {
        if (!(prop in gameObj)) {
          errors.push(`${gamePrefix}: Missing '${prop}' property`);
        } else if (typeof gameObj[prop] !== 'string') {
          errors.push(`${gamePrefix}: '${prop}' must be a string`);
        }
      }

      // Validate optional break_after
      if ('break_after' in gameObj && typeof gameObj.break_after !== 'number') {
        errors.push(`${gamePrefix}: 'break_after' must be a number`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a suggested filename for the exported schedule.
 *
 * @param state - The designer state
 * @returns A suggested filename string
 *
 * @example
 * const filename = generateExportFilename(state);
 * // "schedule_4_teams_2_fields.json"
 */
export function generateExportFilename(state: DesignerState): string {
  const fieldCount = state.fields.length;
  const gameCount = state.fields.reduce(
    (sum, field) => sum + field.gameSlots.length,
    0
  );

  return `schedule_${gameCount}_games_${fieldCount}_fields.json`;
}

/**
 * Downloads the schedule as a JSON file.
 *
 * @param state - The designer state to export
 * @param filename - Optional filename (defaults to generated name)
 */
export function downloadScheduleJson(
  state: DesignerState,
  filename?: string
): void {
  const json = exportToJson(state);
  const jsonString = JSON.stringify(json, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? generateExportFilename(state);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
