import { describe, it, expect } from 'vitest';
import {
  TeamReference,
  isGroupTeamReference,
  isStandingReference,
  isWinnerReference,
  isLoserReference,
  isStaticReference,
  createEmptyValidationResult,
  createInitialDesignerState,
  createDefaultTeamReference,
  createDefaultGameSlot,
  createDefaultField,
} from '../designer';

describe('Type Guards', () => {
  describe('isGroupTeamReference', () => {
    it('returns true for group team references', () => {
      const ref: TeamReference = { type: 'groupTeam', group: 0, team: 1 };
      expect(isGroupTeamReference(ref)).toBe(true);
    });

    it('returns false for other reference types', () => {
      const standing: TeamReference = {
        type: 'standing',
        place: 1,
        groupName: 'Gruppe 1',
      };
      const winner: TeamReference = { type: 'winner', matchName: 'HF1' };
      const loser: TeamReference = { type: 'loser', matchName: 'Spiel 3' };
      const staticRef: TeamReference = { type: 'static', name: 'Team A' };

      expect(isGroupTeamReference(standing)).toBe(false);
      expect(isGroupTeamReference(winner)).toBe(false);
      expect(isGroupTeamReference(loser)).toBe(false);
      expect(isGroupTeamReference(staticRef)).toBe(false);
    });
  });

  describe('isStandingReference', () => {
    it('returns true for standing references', () => {
      const ref: TeamReference = {
        type: 'standing',
        place: 2,
        groupName: 'Gruppe 1',
      };
      expect(isStandingReference(ref)).toBe(true);
    });

    it('returns false for other reference types', () => {
      const groupTeam: TeamReference = { type: 'groupTeam', group: 0, team: 1 };
      expect(isStandingReference(groupTeam)).toBe(false);
    });
  });

  describe('isWinnerReference', () => {
    it('returns true for winner references', () => {
      const ref: TeamReference = { type: 'winner', matchName: 'HF1' };
      expect(isWinnerReference(ref)).toBe(true);
    });

    it('returns false for other reference types', () => {
      const loser: TeamReference = { type: 'loser', matchName: 'Spiel 3' };
      expect(isWinnerReference(loser)).toBe(false);
    });
  });

  describe('isLoserReference', () => {
    it('returns true for loser references', () => {
      const ref: TeamReference = { type: 'loser', matchName: 'Spiel 3' };
      expect(isLoserReference(ref)).toBe(true);
    });

    it('returns false for other reference types', () => {
      const winner: TeamReference = { type: 'winner', matchName: 'HF1' };
      expect(isLoserReference(winner)).toBe(false);
    });
  });

  describe('isStaticReference', () => {
    it('returns true for static references', () => {
      const ref: TeamReference = { type: 'static', name: 'Team Officials' };
      expect(isStaticReference(ref)).toBe(true);
    });

    it('returns false for other reference types', () => {
      const groupTeam: TeamReference = { type: 'groupTeam', group: 0, team: 1 };
      expect(isStaticReference(groupTeam)).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createEmptyValidationResult', () => {
    it('returns a valid empty validation result', () => {
      const result = createEmptyValidationResult();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('createInitialDesignerState', () => {
    it('returns an empty designer state', () => {
      const state = createInitialDesignerState();

      expect(state.fields).toEqual([]);
      expect(state.selectedGameSlot).toBeNull();
      expect(state.validationResult.isValid).toBe(true);
      expect(state.validationResult.errors).toEqual([]);
      expect(state.validationResult.warnings).toEqual([]);
    });
  });

  describe('createDefaultTeamReference', () => {
    it('returns a static empty reference', () => {
      const ref = createDefaultTeamReference();

      expect(ref.type).toBe('static');
      expect(isStaticReference(ref)).toBe(true);
      if (isStaticReference(ref)) {
        expect(ref.name).toBe('');
      }
    });
  });

  describe('createDefaultGameSlot', () => {
    it('creates a game slot with the given id', () => {
      const slot = createDefaultGameSlot('test-id');

      expect(slot.id).toBe('test-id');
    });

    it('uses Vorrunde as default stage', () => {
      const slot = createDefaultGameSlot('test-id');

      expect(slot.stage).toBe('Vorrunde');
    });

    it('has empty standing', () => {
      const slot = createDefaultGameSlot('test-id');

      expect(slot.standing).toBe('');
    });

    it('has default team references for home, away, and official', () => {
      const slot = createDefaultGameSlot('test-id');

      expect(slot.home.type).toBe('static');
      expect(slot.away.type).toBe('static');
      expect(slot.official.type).toBe('static');
    });

    it('has zero break time', () => {
      const slot = createDefaultGameSlot('test-id');

      expect(slot.breakAfter).toBe(0);
    });
  });

  describe('createDefaultField', () => {
    it('creates a field with the given id and order', () => {
      const field = createDefaultField('field-id', 0);

      expect(field.id).toBe('field-id');
      expect(field.order).toBe(0);
    });

    it('uses order+1 for the default name', () => {
      const field0 = createDefaultField('field-0', 0);
      const field1 = createDefaultField('field-1', 1);
      const field2 = createDefaultField('field-2', 2);

      expect(field0.name).toBe('Feld 1');
      expect(field1.name).toBe('Feld 2');
      expect(field2.name).toBe('Feld 3');
    });

    it('starts with empty game slots', () => {
      const field = createDefaultField('field-id', 0);

      expect(field.gameSlots).toEqual([]);
    });
  });
});
