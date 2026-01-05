import { describe, it, expect, vi } from 'vitest';
import Validator from '../validation';
import { Player, Roster, TeamValidator } from '../../common/types';
import { MessageColor } from '../../context/MessageContext';

const createPlayer = (
  id: number,
  isSelected: boolean = false,
  jersey_number: number = id
): Player => ({
  id,
  first_name: `Player${id}`,
  last_name: `Last${id}`,
  jersey_number,
  isSelected,
  is_sub_in_other_league: false,
  gender: 'M',
});

describe('Validator', () => {
  describe('MinimumPlayerStrengthValidator', () => {
    it('validates minimum player strength', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, false),
      ];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 3,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(false);
    });

    it('passes when minimum player strength is met', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, true),
      ];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 3,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(true);
    });
  });

  describe('MaximumPlayerStrengthValidator', () => {
    it('validates maximum player strength', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, true),
        createPlayer(4, false),
      ];
      const teamValidator: TeamValidator = {
        maximum_player_strength: 2,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(false);
    });

    it('passes when maximum player strength is not exceeded', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, false),
      ];
      const teamValidator: TeamValidator = {
        maximum_player_strength: 3,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(true);
    });

    it('adds validation errors to non-selected players when max is exceeded', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, false),
      ];
      const teamValidator: TeamValidator = {
        maximum_player_strength: 2,
      };

      const validator = new Validator(teamValidator, roster);
      validator.validateAndUpdate();

      expect(roster[2].validationError).toBeDefined();
    });

    it('returns warning message color', () => {
      const roster: Roster = [createPlayer(1, true), createPlayer(2, true)];
      const teamValidator: TeamValidator = {
        maximum_player_strength: 1,
      };

      const validator = new Validator(teamValidator, roster);
      const setMessage = vi.fn();
      validator.validateAndUpdate(setMessage);

      expect(setMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          color: MessageColor.Warning,
        })
      );
    });
  });

  describe('MaxSubsInOtherLeagues', () => {
    it('validates max subs in other leagues', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, true),
        createPlayer(3, false),
      ];
      const teamValidator: TeamValidator = {
        max_subs_in_other_leagues: 1,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(false);
    });

    it('passes when subs limit is not exceeded', () => {
      const roster: Roster = [
        createPlayer(1, true),
        createPlayer(2, false),
      ];
      const teamValidator: TeamValidator = {
        max_subs_in_other_leagues: 2,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(true);
    });
  });

  describe('JerseyNumberBetweenValidator', () => {
    it('validates jersey number is within range', () => {
      const roster: Roster = [createPlayer(1, false, 50)];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors).toHaveLength(0);
    });

    it('fails when jersey number is below minimum', () => {
      const roster: Roster = [createPlayer(1, false, 0)];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Trikotnummer muss eine Zahl zwischen');
    });

    it('fails when jersey number is above maximum', () => {
      const roster: Roster = [createPlayer(1, false, 100)];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Trikotnummer muss eine Zahl zwischen');
    });
  });

  describe('UniqueJerseyNumber', () => {
    it('validates jersey numbers are unique', () => {
      const roster: Roster = [
        createPlayer(1, false, 10),
        createPlayer(2, false, 20),
      ];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors).toHaveLength(0);
    });

    it('fails when jersey number is duplicated', () => {
      const roster: Roster = [
        createPlayer(1, false, 10),
        createPlayer(2, false, 10),
      ];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[1]);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('bereits in Verwendung'))).toBe(true);
    });
  });

  describe('validateAndUpdate', () => {
    it('calls setMessage with validation error', () => {
      const roster: Roster = [createPlayer(1, false)];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 2,
      };

      const validator = new Validator(teamValidator, roster);
      const setMessage = vi.fn();
      validator.validateAndUpdate(setMessage);

      expect(setMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Mindestspielstärke'),
          color: MessageColor.Danger,
        })
      );
    });

    it('clears message when validation passes', () => {
      const roster: Roster = [createPlayer(1, true), createPlayer(2, true)];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 2,
      };

      const validator = new Validator(teamValidator, roster);
      const setMessage = vi.fn();
      validator.validateAndUpdate(setMessage);

      expect(setMessage).toHaveBeenCalledWith({ text: '' });
    });

    it('does not call setMessage when it is null', () => {
      const roster: Roster = [createPlayer(1, false)];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 2,
      };

      const validator = new Validator(teamValidator, roster);
      expect(() => validator.validateAndUpdate(null)).not.toThrow();
    });
  });

  describe('validateAndGetErrors', () => {
    it('returns multiple errors for a player', () => {
      const roster: Roster = [
        createPlayer(1, false, 0),
        createPlayer(2, false, 10),
      ];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('returns empty array when player is valid', () => {
      const roster: Roster = [createPlayer(1, false, 50)];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Complex validation scenarios', () => {
    it('validates multiple roster-level rules together', () => {
      const roster: Roster = [
        createPlayer(1, true, 10),
        createPlayer(2, true, 20),
        createPlayer(3, false, 30),
      ];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 2,
        maximum_player_strength: 5,
        max_subs_in_other_leagues: 3,
      };

      const validator = new Validator(teamValidator, roster);
      const isValid = validator.validateAndUpdate();

      expect(isValid).toBe(true);
    });

    it('validates jersey number rules for specific player', () => {
      const roster: Roster = [
        createPlayer(1, false, 10),
        createPlayer(2, false, 20),
      ];
      const teamValidator: TeamValidator = {
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors).toHaveLength(0);
    });

    it('fails when jersey number validation rule fails', () => {
      const roster: Roster = [
        createPlayer(1, true, 100), // Invalid jersey number
        createPlayer(2, true, 20),
      ];
      const teamValidator: TeamValidator = {
        minimum_player_strength: 2,
        jerseyNumberBetween: { min: 1, max: 99 },
      };

      const validator = new Validator(teamValidator, roster);
      const errors = validator.validateAndGetErrors(roster[0]);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
