/**
 * Tests for time format validation and parsing
 */

import { describe, it, expect } from 'vitest';
import { isValidTimeFormat, parseTime, formatTime } from '../timeCalculation';

describe('timeCalculation - Format Validation and Parsing', () => {
  describe('isValidTimeFormat', () => {
    it('should accept HH:MM format', () => {
      expect(isValidTimeFormat('10:00')).toBe(true);
      expect(isValidTimeFormat('09:30')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidTimeFormat('10:0')).toBe(false);
      expect(isValidTimeFormat('24:00')).toBe(false);
      expect(isValidTimeFormat('10:60')).toBe(false);
      expect(isValidTimeFormat('abc')).toBe(false);
    });

    it('should accept HH:MM:SS format', () => {
      // Browsers sometimes return HH:MM:SS for time inputs
      expect(isValidTimeFormat('10:00:00')).toBe(true);
      expect(isValidTimeFormat('23:59:59')).toBe(true);
    });
  });

  describe('parseTime', () => {
    it('should parse HH:MM format correctly', () => {
      expect(parseTime('10:00')).toBe(600);
      expect(parseTime('00:00')).toBe(0);
      expect(parseTime('23:59')).toBe(1439);
    });

    it('should parse HH:MM:SS format correctly (ignoring seconds)', () => {
      expect(parseTime('10:00:00')).toBe(600);
      expect(parseTime('12:30:45')).toBe(750);
    });
  });
});
