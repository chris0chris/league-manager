import { describe, it, expect } from 'vitest';
import {
  formatTeamReference,
  parseTeamReference,
} from '../teamReference';
import type { TeamReference } from '../../types/designer';

describe('formatTeamReference', () => {
  describe('groupTeam format', () => {
    it('formats group 0, team 0 as "0_0"', () => {
      const ref: TeamReference = { type: 'groupTeam', group: 0, team: 0 };
      expect(formatTeamReference(ref)).toBe('0_0');
    });

    it('formats group 0, team 1 as "0_1"', () => {
      const ref: TeamReference = { type: 'groupTeam', group: 0, team: 1 };
      expect(formatTeamReference(ref)).toBe('0_1');
    });

    it('formats group 1, team 2 as "1_2"', () => {
      const ref: TeamReference = { type: 'groupTeam', group: 1, team: 2 };
      expect(formatTeamReference(ref)).toBe('1_2');
    });

    it('formats higher group numbers correctly', () => {
      const ref: TeamReference = { type: 'groupTeam', group: 3, team: 5 };
      expect(formatTeamReference(ref)).toBe('3_5');
    });
  });

  describe('standing format', () => {
    it('formats place 1 in Gruppe 1 as "P1 Gruppe 1"', () => {
      const ref: TeamReference = {
        type: 'standing',
        place: 1,
        groupName: 'Gruppe 1',
      };
      expect(formatTeamReference(ref)).toBe('P1 Gruppe 1');
    });

    it('formats place 2 in Gruppe 2 as "P2 Gruppe 2"', () => {
      const ref: TeamReference = {
        type: 'standing',
        place: 2,
        groupName: 'Gruppe 2',
      };
      expect(formatTeamReference(ref)).toBe('P2 Gruppe 2');
    });

    it('handles custom group names', () => {
      const ref: TeamReference = {
        type: 'standing',
        place: 3,
        groupName: 'Pool A',
      };
      expect(formatTeamReference(ref)).toBe('P3 Pool A');
    });
  });

  describe('winner format', () => {
    it('formats winner of HF1 as "Gewinner HF1"', () => {
      const ref: TeamReference = { type: 'winner', matchName: 'HF1' };
      expect(formatTeamReference(ref)).toBe('Gewinner HF1');
    });

    it('formats winner of Spiel 3 as "Gewinner Spiel 3"', () => {
      const ref: TeamReference = { type: 'winner', matchName: 'Spiel 3' };
      expect(formatTeamReference(ref)).toBe('Gewinner Spiel 3');
    });

    it('handles complex match names', () => {
      const ref: TeamReference = { type: 'winner', matchName: 'P1 vs P2' };
      expect(formatTeamReference(ref)).toBe('Gewinner P1 vs P2');
    });
  });

  describe('loser format', () => {
    it('formats loser of HF1 as "Verlierer HF1"', () => {
      const ref: TeamReference = { type: 'loser', matchName: 'HF1' };
      expect(formatTeamReference(ref)).toBe('Verlierer HF1');
    });

    it('formats loser of Spiel 3 as "Verlierer Spiel 3"', () => {
      const ref: TeamReference = { type: 'loser', matchName: 'Spiel 3' };
      expect(formatTeamReference(ref)).toBe('Verlierer Spiel 3');
    });
  });

  describe('static format', () => {
    it('returns the name directly for static references', () => {
      const ref: TeamReference = { type: 'static', name: 'Team Officials' };
      expect(formatTeamReference(ref)).toBe('Team Officials');
    });

    it('handles empty names', () => {
      const ref: TeamReference = { type: 'static', name: '' };
      expect(formatTeamReference(ref)).toBe('');
    });

    it('handles team names with special characters', () => {
      const ref: TeamReference = { type: 'static', name: 'Team A & B' };
      expect(formatTeamReference(ref)).toBe('Team A & B');
    });
  });
});

describe('parseTeamReference', () => {
  describe('groupTeam format', () => {
    it('parses "0_0" as group 0, team 0', () => {
      const result = parseTeamReference('0_0');
      expect(result).toEqual({ type: 'groupTeam', group: 0, team: 0 });
    });

    it('parses "0_1" as group 0, team 1', () => {
      const result = parseTeamReference('0_1');
      expect(result).toEqual({ type: 'groupTeam', group: 0, team: 1 });
    });

    it('parses "1_2" as group 1, team 2', () => {
      const result = parseTeamReference('1_2');
      expect(result).toEqual({ type: 'groupTeam', group: 1, team: 2 });
    });

    it('parses higher group numbers correctly', () => {
      const result = parseTeamReference('3_5');
      expect(result).toEqual({ type: 'groupTeam', group: 3, team: 5 });
    });

    it('parses double-digit indices', () => {
      const result = parseTeamReference('10_12');
      expect(result).toEqual({ type: 'groupTeam', group: 10, team: 12 });
    });
  });

  describe('standing format', () => {
    it('parses "P1 Gruppe 1" as place 1 in Gruppe 1', () => {
      const result = parseTeamReference('P1 Gruppe 1');
      expect(result).toEqual({
        type: 'standing',
        place: 1,
        groupName: 'Gruppe 1',
      });
    });

    it('parses "P2 Gruppe 2" as place 2 in Gruppe 2', () => {
      const result = parseTeamReference('P2 Gruppe 2');
      expect(result).toEqual({
        type: 'standing',
        place: 2,
        groupName: 'Gruppe 2',
      });
    });

    it('parses custom group names', () => {
      const result = parseTeamReference('P3 Pool A');
      expect(result).toEqual({
        type: 'standing',
        place: 3,
        groupName: 'Pool A',
      });
    });

    it('handles group names with multiple words', () => {
      const result = parseTeamReference('P1 Gruppe A Nord');
      expect(result).toEqual({
        type: 'standing',
        place: 1,
        groupName: 'Gruppe A Nord',
      });
    });
  });

  describe('winner format', () => {
    it('parses "Gewinner HF1" as winner of HF1', () => {
      const result = parseTeamReference('Gewinner HF1');
      expect(result).toEqual({ type: 'winner', matchName: 'HF1' });
    });

    it('parses "Gewinner Spiel 3" as winner of Spiel 3', () => {
      const result = parseTeamReference('Gewinner Spiel 3');
      expect(result).toEqual({ type: 'winner', matchName: 'Spiel 3' });
    });

    it('handles match names with spaces', () => {
      const result = parseTeamReference('Gewinner P1 vs P2');
      expect(result).toEqual({ type: 'winner', matchName: 'P1 vs P2' });
    });
  });

  describe('loser format', () => {
    it('parses "Verlierer HF1" as loser of HF1', () => {
      const result = parseTeamReference('Verlierer HF1');
      expect(result).toEqual({ type: 'loser', matchName: 'HF1' });
    });

    it('parses "Verlierer Spiel 3" as loser of Spiel 3', () => {
      const result = parseTeamReference('Verlierer Spiel 3');
      expect(result).toEqual({ type: 'loser', matchName: 'Spiel 3' });
    });
  });

  describe('static format', () => {
    it('parses "Team Officials" as static reference', () => {
      const result = parseTeamReference('Team Officials');
      expect(result).toEqual({ type: 'static', name: 'Team Officials' });
    });

    it('parses arbitrary text as static reference', () => {
      const result = parseTeamReference('Some Random Team');
      expect(result).toEqual({ type: 'static', name: 'Some Random Team' });
    });

    it('handles empty string as static reference', () => {
      const result = parseTeamReference('');
      expect(result).toEqual({ type: 'static', name: '' });
    });
  });

  describe('round-trip formatting', () => {
    it('formats and parses groupTeam reference correctly', () => {
      const original: TeamReference = { type: 'groupTeam', group: 1, team: 3 };
      const formatted = formatTeamReference(original);
      const parsed = parseTeamReference(formatted);
      expect(parsed).toEqual(original);
    });

    it('formats and parses standing reference correctly', () => {
      const original: TeamReference = {
        type: 'standing',
        place: 2,
        groupName: 'Gruppe 1',
      };
      const formatted = formatTeamReference(original);
      const parsed = parseTeamReference(formatted);
      expect(parsed).toEqual(original);
    });

    it('formats and parses winner reference correctly', () => {
      const original: TeamReference = { type: 'winner', matchName: 'HF2' };
      const formatted = formatTeamReference(original);
      const parsed = parseTeamReference(formatted);
      expect(parsed).toEqual(original);
    });

    it('formats and parses loser reference correctly', () => {
      const original: TeamReference = { type: 'loser', matchName: 'Spiel 5' };
      const formatted = formatTeamReference(original);
      const parsed = parseTeamReference(formatted);
      expect(parsed).toEqual(original);
    });

    it('formats and parses static reference correctly', () => {
      const original: TeamReference = { type: 'static', name: 'Team XYZ' };
      const formatted = formatTeamReference(original);
      const parsed = parseTeamReference(formatted);
      expect(parsed).toEqual(original);
    });
  });

  describe('edge cases', () => {
    it('does not confuse "P1" alone with standing format', () => {
      // "P1" alone should be static, not standing (needs group name)
      const result = parseTeamReference('P1');
      expect(result).toEqual({ type: 'static', name: 'P1' });
    });

    it('handles whitespace-only strings as static', () => {
      const result = parseTeamReference('   ');
      expect(result).toEqual({ type: 'static', name: '   ' });
    });

    it('parses correctly from real JSON schedule examples', () => {
      // From schedule_4_final4_1.json
      expect(parseTeamReference('0_0')).toEqual({
        type: 'groupTeam',
        group: 0,
        team: 0,
      });
      expect(parseTeamReference('0_1')).toEqual({
        type: 'groupTeam',
        group: 0,
        team: 1,
      });
      expect(parseTeamReference('Verlierer Spiel 1')).toEqual({
        type: 'loser',
        matchName: 'Spiel 1',
      });
      expect(parseTeamReference('Gewinner Spiel 1')).toEqual({
        type: 'winner',
        matchName: 'Spiel 1',
      });
    });
  });
});
