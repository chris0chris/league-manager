/**
 * useValidation Hook
 *
 * Provides real-time validation of the schedule:
 * - Official cannot be home or away team
 * - No circular dependencies in result refs
 * - All team references are valid format
 * - Invalid match references detected
 * - Duplicate standing warnings
 */

import { useMemo } from 'react';
import type {
  Field,
  GameSlot,
  TeamReference,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/designer';
import { formatTeamReference } from '../utils/teamReference';

/**
 * Check if a team reference is a result reference (winner/loser).
 */
function isResultReference(
  ref: TeamReference
): ref is TeamReference & { matchName: string } {
  return ref.type === 'winner' || ref.type === 'loser';
}

/**
 * Get all match names referenced by a game slot.
 */
function getReferencedMatchNames(slot: GameSlot): string[] {
  const refs: string[] = [];

  if (isResultReference(slot.home)) {
    refs.push(slot.home.matchName);
  }
  if (isResultReference(slot.away)) {
    refs.push(slot.away.matchName);
  }
  if (isResultReference(slot.official)) {
    refs.push(slot.official.matchName);
  }

  return refs;
}

/**
 * Collect all standing names from all fields.
 */
function getAllStandingNames(fields: Field[]): Set<string> {
  const standings = new Set<string>();
  for (const field of fields) {
    for (const slot of field.gameSlots) {
      if (slot.standing) {
        standings.add(slot.standing);
      }
    }
  }
  return standings;
}

/**
 * Check for official playing conflicts.
 */
function checkOfficialPlaying(fields: Field[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    for (const slot of field.gameSlots) {
      const official = formatTeamReference(slot.official);
      const home = formatTeamReference(slot.home);
      const away = formatTeamReference(slot.away);

      if (official === home || official === away) {
        errors.push({
          id: `${slot.id}_official_playing`,
          type: 'official_playing',
          message: `Game "${slot.standing}": Team "${official}" cannot officiate a game they are playing in`,
          affectedSlots: [slot.id],
        });
      }
    }
  }

  return errors;
}

/**
 * Check for invalid match references.
 */
function checkInvalidReferences(fields: Field[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const allStandings = getAllStandingNames(fields);

  for (const field of fields) {
    for (const slot of field.gameSlots) {
      const referencedMatches = getReferencedMatchNames(slot);

      for (const matchName of referencedMatches) {
        if (!allStandings.has(matchName)) {
          errors.push({
            id: `${slot.id}_invalid_ref_${matchName}`,
            type: 'invalid_reference',
            message: `Game "${slot.standing}": Referenced match "${matchName}" does not exist`,
            affectedSlots: [slot.id],
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Build a dependency graph and check for circular dependencies.
 */
function checkCircularDependencies(fields: Field[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build a map of standing -> game slot
  const standingToSlot = new Map<string, GameSlot>();
  for (const field of fields) {
    for (const slot of field.gameSlots) {
      if (slot.standing) {
        standingToSlot.set(slot.standing, slot);
      }
    }
  }

  // Build dependency graph: standing -> standings it depends on
  const dependencies = new Map<string, Set<string>>();
  for (const [standing, slot] of standingToSlot) {
    const refs = getReferencedMatchNames(slot);
    dependencies.set(standing, new Set(refs));
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(standing: string, path: string[]): boolean {
    if (inStack.has(standing)) {
      // Found a cycle
      return true;
    }
    if (visited.has(standing)) {
      return false;
    }

    visited.add(standing);
    inStack.add(standing);

    const deps = dependencies.get(standing) || new Set();
    for (const dep of deps) {
      if (hasCycle(dep, [...path, standing])) {
        return true;
      }
    }

    inStack.delete(standing);
    return false;
  }

  for (const standing of standingToSlot.keys()) {
    visited.clear();
    inStack.clear();
    if (hasCycle(standing, [])) {
      const slot = standingToSlot.get(standing)!;
      errors.push({
        id: `${slot.id}_circular_dependency`,
        type: 'circular_dependency',
        message: `Game "${standing}": Circular dependency detected in match references`,
        affectedSlots: [slot.id],
      });
    }
  }

  return errors;
}

/**
 * Check for duplicate standing names.
 */
function checkDuplicateStandings(fields: Field[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const standingCounts = new Map<string, GameSlot[]>();

  for (const field of fields) {
    for (const slot of field.gameSlots) {
      if (slot.standing) {
        const slots = standingCounts.get(slot.standing) || [];
        slots.push(slot);
        standingCounts.set(slot.standing, slots);
      }
    }
  }

  for (const [standing, slots] of standingCounts) {
    if (slots.length > 1) {
      warnings.push({
        id: `duplicate_standing_${standing}`,
        type: 'duplicate_standing',
        message: `Standing "${standing}" is used by ${slots.length} games`,
        affectedSlots: slots.map((s) => s.id),
      });
    }
  }

  return warnings;
}

/**
 * useValidation hook.
 *
 * Validates the current schedule and returns errors and warnings.
 *
 * @param fields - The fields to validate
 * @returns Validation result with errors and warnings
 */
export function useValidation(fields: Field[]): ValidationResult {
  return useMemo(() => {
    const errors: ValidationError[] = [
      ...checkOfficialPlaying(fields),
      ...checkInvalidReferences(fields),
      ...checkCircularDependencies(fields),
    ];

    const warnings: ValidationWarning[] = [
      ...checkDuplicateStandings(fields),
    ];

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [fields]);
}
