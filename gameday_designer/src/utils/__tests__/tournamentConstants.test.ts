/**
 * Tests for tournament constants
 *
 * Validates constant values and ensures no duplicates exist.
 */

import { describe, it, expect } from 'vitest';
import {
  BRACKET_SIZE_FINAL_ONLY,
  BRACKET_SIZE_WITH_SEMIFINALS,
  BRACKET_SIZE_WITH_QUARTERFINALS,
  MIN_TEAMS_FOR_BRACKET,
  MIN_TEAMS_FOR_SEMIFINALS,
  MIN_TEAMS_FOR_SPLIT_GROUPS,
  GROUP_A_FIRST_GAME,
  GROUP_A_SECOND_GAME,
  GROUP_A_THIRD_GAME,
  GROUP_B_FIRST_GAME,
  GROUP_B_FOURTH_GAME,
  GROUP_B_THIRD_GAME,
  LAST_GAME_OFFSET,
  SECOND_TO_LAST_GAME_OFFSET,
  HIGHLIGHT_AUTO_CLEAR_DELAY,
  TOURNAMENT_GENERATION_STATE_DELAY,
  EDGE_INSPECTION_DELAY,
  GAME_STANDING_FINAL,
  GAME_STANDING_THIRD_PLACE,
  GAME_STANDING_SF1,
  GAME_STANDING_SF2,
  GAME_STANDING_QF1,
  GAME_STANDING_QF2,
  GAME_STANDING_QF3,
  GAME_STANDING_QF4,
  GAME_STANDING_CO1,
  GAME_STANDING_CO2,
  DEFAULT_TOURNAMENT_GROUP_NAME,
  TEAM_COLORS,
} from '../tournamentConstants';

describe('tournamentConstants', () => {
  describe('Bracket Size Constants', () => {
    it('should have correct bracket size values', () => {
      expect(BRACKET_SIZE_FINAL_ONLY).toBe(2);
      expect(BRACKET_SIZE_WITH_SEMIFINALS).toBe(4);
      expect(BRACKET_SIZE_WITH_QUARTERFINALS).toBe(8);
    });

    it('should have bracket sizes in ascending order', () => {
      expect(BRACKET_SIZE_FINAL_ONLY).toBeLessThan(BRACKET_SIZE_WITH_SEMIFINALS);
      expect(BRACKET_SIZE_WITH_SEMIFINALS).toBeLessThan(BRACKET_SIZE_WITH_QUARTERFINALS);
    });
  });

  describe('Minimum Team Requirements', () => {
    it('should have correct minimum team values', () => {
      expect(MIN_TEAMS_FOR_BRACKET).toBe(2);
      expect(MIN_TEAMS_FOR_SEMIFINALS).toBe(3);
      expect(MIN_TEAMS_FOR_SPLIT_GROUPS).toBe(6);
    });

    it('should have team requirements in ascending order', () => {
      expect(MIN_TEAMS_FOR_BRACKET).toBeLessThan(MIN_TEAMS_FOR_SEMIFINALS);
      expect(MIN_TEAMS_FOR_SEMIFINALS).toBeLessThan(MIN_TEAMS_FOR_SPLIT_GROUPS);
    });
  });

  describe('Source Game Indices', () => {
    it('should have correct group game indices', () => {
      expect(GROUP_A_FIRST_GAME).toBe(0);
      expect(GROUP_A_SECOND_GAME).toBe(1);
      expect(GROUP_A_THIRD_GAME).toBe(2);
      expect(GROUP_B_FIRST_GAME).toBe(3);
      expect(GROUP_B_FOURTH_GAME).toBe(4);
      expect(GROUP_B_THIRD_GAME).toBe(5);
    });

    it('should have group indices in sequential order', () => {
      expect(GROUP_A_FIRST_GAME).toBeLessThan(GROUP_A_SECOND_GAME);
      expect(GROUP_A_SECOND_GAME).toBeLessThan(GROUP_A_THIRD_GAME);
      expect(GROUP_A_THIRD_GAME).toBeLessThan(GROUP_B_FIRST_GAME);
      expect(GROUP_B_FIRST_GAME).toBeLessThan(GROUP_B_FOURTH_GAME);
      expect(GROUP_B_FOURTH_GAME).toBeLessThan(GROUP_B_THIRD_GAME);
    });

    it('should have unique indices', () => {
      const indices = [
        GROUP_A_FIRST_GAME,
        GROUP_A_SECOND_GAME,
        GROUP_A_THIRD_GAME,
        GROUP_B_FIRST_GAME,
        GROUP_B_FOURTH_GAME,
        GROUP_B_THIRD_GAME,
      ];
      const uniqueIndices = [...new Set(indices)];
      expect(uniqueIndices.length).toBe(indices.length);
    });
  });

  describe('Array Offset Constants', () => {
    it('should have correct offset values', () => {
      expect(LAST_GAME_OFFSET).toBe(1);
      expect(SECOND_TO_LAST_GAME_OFFSET).toBe(2);
    });

    it('should use offsets correctly with array length', () => {
      const testArray = ['game1', 'game2', 'game3', 'game4'];
      const lastGame = testArray[testArray.length - LAST_GAME_OFFSET];
      const secondToLastGame = testArray[testArray.length - SECOND_TO_LAST_GAME_OFFSET];

      expect(lastGame).toBe('game4');
      expect(secondToLastGame).toBe('game3');
    });
  });

  describe('UI Timing Constants', () => {
    it('should have correct timing values in milliseconds', () => {
      expect(HIGHLIGHT_AUTO_CLEAR_DELAY).toBe(3000);
      expect(TOURNAMENT_GENERATION_STATE_DELAY).toBe(500);
      expect(EDGE_INSPECTION_DELAY).toBe(100);
    });

    it('should have positive timing values', () => {
      expect(HIGHLIGHT_AUTO_CLEAR_DELAY).toBeGreaterThan(0);
      expect(TOURNAMENT_GENERATION_STATE_DELAY).toBeGreaterThan(0);
      expect(EDGE_INSPECTION_DELAY).toBeGreaterThan(0);
    });

    it('should have reasonable timing delays', () => {
      expect(EDGE_INSPECTION_DELAY).toBeLessThan(TOURNAMENT_GENERATION_STATE_DELAY);
      expect(TOURNAMENT_GENERATION_STATE_DELAY).toBeLessThan(HIGHLIGHT_AUTO_CLEAR_DELAY);
    });
  });

  describe('Game Standing Labels', () => {
    it('should have correct standing label values', () => {
      expect(GAME_STANDING_FINAL).toBe('Final');
      expect(GAME_STANDING_THIRD_PLACE).toBe('3rd Place');
      expect(GAME_STANDING_SF1).toBe('SF1');
      expect(GAME_STANDING_SF2).toBe('SF2');
      expect(GAME_STANDING_QF1).toBe('QF1');
      expect(GAME_STANDING_QF2).toBe('QF2');
      expect(GAME_STANDING_QF3).toBe('QF3');
      expect(GAME_STANDING_QF4).toBe('QF4');
      expect(GAME_STANDING_CO1).toBe('CO1');
      expect(GAME_STANDING_CO2).toBe('CO2');
    });

    it('should have unique standing labels', () => {
      const labels = [
        GAME_STANDING_FINAL,
        GAME_STANDING_THIRD_PLACE,
        GAME_STANDING_SF1,
        GAME_STANDING_SF2,
        GAME_STANDING_QF1,
        GAME_STANDING_QF2,
        GAME_STANDING_QF3,
        GAME_STANDING_QF4,
        GAME_STANDING_CO1,
        GAME_STANDING_CO2,
      ];
      const uniqueLabels = [...new Set(labels)];
      expect(uniqueLabels.length).toBe(labels.length);
    });

    it('should have non-empty standing labels', () => {
      const labels = [
        GAME_STANDING_FINAL,
        GAME_STANDING_THIRD_PLACE,
        GAME_STANDING_SF1,
        GAME_STANDING_SF2,
        GAME_STANDING_QF1,
        GAME_STANDING_QF2,
        GAME_STANDING_QF3,
        GAME_STANDING_QF4,
        GAME_STANDING_CO1,
        GAME_STANDING_CO2,
      ];
      labels.forEach((label) => {
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Team Generation Constants', () => {
    it('should have correct tournament group name', () => {
      expect(DEFAULT_TOURNAMENT_GROUP_NAME).toBe('Tournament Teams');
    });

    it('should have non-empty group name', () => {
      expect(DEFAULT_TOURNAMENT_GROUP_NAME).toBeTruthy();
      expect(DEFAULT_TOURNAMENT_GROUP_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('Team Colors', () => {
    it('should have 12 distinct colors', () => {
      expect(TEAM_COLORS.length).toBe(12);
    });

    it('should have all colors in hex format', () => {
      TEAM_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should have unique colors', () => {
      const uniqueColors = [...new Set(TEAM_COLORS)];
      expect(uniqueColors.length).toBe(TEAM_COLORS.length);
    });

    it('should have expected color palette', () => {
      expect(TEAM_COLORS[0]).toBe('#3498db'); // Blue
      expect(TEAM_COLORS[1]).toBe('#e74c3c'); // Red
      expect(TEAM_COLORS[2]).toBe('#2ecc71'); // Green
      expect(TEAM_COLORS[3]).toBe('#f39c12'); // Orange
      expect(TEAM_COLORS[4]).toBe('#9b59b6'); // Purple
      expect(TEAM_COLORS[11]).toBe('#8e44ad'); // Dark Purple (last)
    });
  });
});
