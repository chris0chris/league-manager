/**
 * Tests for useValidation hook
 *
 * useValidation provides real-time validation of the schedule:
 * - Official cannot be home or away team
 * - No circular dependencies in result refs
 * - All team references are valid format
 * - Invalid match references detected
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useValidation } from '../useValidation';
import type { Field, GameSlot } from '../../types/designer';

describe('useValidation', () => {
  const createGameSlot = (
    id: string,
    standing: string,
    overrides: Partial<GameSlot> = {}
  ): GameSlot => ({
    id,
    stage: 'Preliminary',
    standing,
    home: { type: 'groupTeam', group: 0, team: 0 },
    away: { type: 'groupTeam', group: 0, team: 1 },
    official: { type: 'groupTeam', group: 0, team: 2 },
    breakAfter: 0,
    ...overrides,
  });

  const createField = (
    id: string,
    name: string,
    gameSlots: GameSlot[]
  ): Field => ({
    id,
    name,
    order: 0,
    gameSlots,
  });

  describe('official playing validation', () => {
    it('returns no errors when official is different from home and away', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'Gruppe 1'),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
    });

    it('detects when official is same as home team', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'Gruppe 1', {
            home: { type: 'groupTeam', group: 0, team: 0 },
            official: { type: 'groupTeam', group: 0, team: 0 }, // Same as home
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].type).toBe('official_playing');
      expect(result.current.errors[0].affectedSlots).toContain('slot-1');
    });

    it('detects when official is same as away team', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'Gruppe 1', {
            away: { type: 'groupTeam', group: 0, team: 1 },
            official: { type: 'groupTeam', group: 0, team: 1 }, // Same as away
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].type).toBe('official_playing');
    });

    it('detects official conflicts using standing references', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'HF1', {
            home: { type: 'standing', place: 1, groupName: 'Gruppe 1' },
            official: { type: 'standing', place: 1, groupName: 'Gruppe 1' }, // Same
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors[0].type).toBe('official_playing');
    });
  });

  describe('invalid match reference validation', () => {
    it('returns no errors when all winner/loser references exist', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'HF1'),
          createGameSlot('slot-2', 'HF2'),
          createGameSlot('slot-3', 'Finale', {
            home: { type: 'winner', matchName: 'HF1' },
            away: { type: 'winner', matchName: 'HF2' },
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.errors.filter((e) => e.type === 'invalid_reference')).toHaveLength(0);
    });

    it('detects winner reference to non-existent match', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'Finale', {
            home: { type: 'winner', matchName: 'HF1' }, // HF1 doesn't exist
            away: { type: 'groupTeam', group: 0, team: 0 },
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.some((e) => e.type === 'invalid_reference')).toBe(true);
    });

    it('detects loser reference to non-existent match', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'P3', {
            home: { type: 'loser', matchName: 'HF1' }, // HF1 doesn't exist
            away: { type: 'groupTeam', group: 0, team: 0 },
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.some((e) => e.type === 'invalid_reference')).toBe(true);
    });
  });

  describe('circular dependency validation', () => {
    it('returns no errors for linear dependencies', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'HF1'),
          createGameSlot('slot-2', 'HF2'),
          createGameSlot('slot-3', 'Finale', {
            home: { type: 'winner', matchName: 'HF1' },
            away: { type: 'winner', matchName: 'HF2' },
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.errors.filter((e) => e.type === 'circular_dependency')).toHaveLength(0);
    });

    it('detects direct circular dependency (A -> B -> A)', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'GameA', {
            home: { type: 'winner', matchName: 'GameB' },
          }),
          createGameSlot('slot-2', 'GameB', {
            home: { type: 'winner', matchName: 'GameA' },
          }),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.some((e) => e.type === 'circular_dependency')).toBe(true);
    });
  });

  describe('duplicate standing warnings', () => {
    it('returns no warnings when all standings are unique', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'HF1'),
          createGameSlot('slot-2', 'HF2'),
          createGameSlot('slot-3', 'Finale'),
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.warnings.filter((w) => w.type === 'duplicate_standing')).toHaveLength(0);
    });

    it('warns when multiple games have the same standing', () => {
      const fields = [
        createField('field-1', 'Feld 1', [
          createGameSlot('slot-1', 'Gruppe 1'),
          createGameSlot('slot-2', 'Gruppe 1'), // Duplicate
        ]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.warnings.some((w) => w.type === 'duplicate_standing')).toBe(true);
    });
  });

  describe('empty schedule', () => {
    it('returns valid for empty fields array', () => {
      const { result } = renderHook(() => useValidation([]));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toHaveLength(0);
      expect(result.current.warnings).toHaveLength(0);
    });

    it('returns valid for fields with no games', () => {
      const fields = [createField('field-1', 'Feld 1', [])];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('validation result structure', () => {
    it('returns correct result structure', () => {
      const fields = [
        createField('field-1', 'Feld 1', [createGameSlot('slot-1', 'Gruppe 1')]),
      ];

      const { result } = renderHook(() => useValidation(fields));

      expect(result.current).toHaveProperty('isValid');
      expect(result.current).toHaveProperty('errors');
      expect(result.current).toHaveProperty('warnings');
      expect(Array.isArray(result.current.errors)).toBe(true);
      expect(Array.isArray(result.current.warnings)).toBe(true);
    });
  });
});
