/**
 * Tests for Search Engine Utility
 *
 * Verifies parsing of search queries and "dork" style filtering.
 */

import { describe, it, expect } from 'vitest';
import { parseSearchQuery, matchGameday } from '../searchEngine';
import type { GamedayListEntry } from '../../types';

describe('Search Engine', () => {
  describe('parseSearchQuery', () => {
    it('should parse simple text queries', () => {
      expect(parseSearchQuery('test query')).toEqual({
        text: 'test query',
        filters: {}
      });
    });

    it('should parse single dork filter', () => {
      expect(parseSearchQuery('season:2026')).toEqual({
        text: '',
        filters: { season: '2026' }
      });
    });

    it('should parse mixed text and dorks', () => {
      expect(parseSearchQuery('final game season:2026 league:DFFL')).toEqual({
        text: 'final game',
        filters: {
          season: '2026',
          league: 'DFFL'
        }
      });
    });

    it('should handle quoted values in dorks', () => {
      expect(parseSearchQuery('league:"Major League"')).toEqual({
        text: '',
        filters: { league: 'Major League' }
      });
    });
  });

  describe('matchGameday', () => {
    const mockGameday: GamedayListEntry = {
      id: 1,
      name: 'DFFL Final 2026',
      date: '2026-09-15',
      start: '10:00',
      format: '6_2',
      author: 1,
      address: 'Main Stadium',
      season: 1,
      season_display: 'Season 2026',
      league: 1,
      league_display: 'DFFL',
      status: 'scheduled'
    };

    it('should match by name (case insensitive)', () => {
      expect(matchGameday(mockGameday, 'final')).toBe(true);
      expect(matchGameday(mockGameday, 'FINAL')).toBe(true);
      expect(matchGameday(mockGameday, 'xyz')).toBe(false);
    });

    it('should match by specific dorks', () => {
      expect(matchGameday(mockGameday, 'season:2026')).toBe(true);
      expect(matchGameday(mockGameday, 'league:DFFL')).toBe(true);
      expect(matchGameday(mockGameday, 'season:2025')).toBe(false);
    });

    it('should match combined text and dorks', () => {
      expect(matchGameday(mockGameday, 'final season:2026')).toBe(true);
      expect(matchGameday(mockGameday, 'qualifier season:2026')).toBe(false);
    });

    it('should match by status dork', () => {
      expect(matchGameday(mockGameday, 'status:scheduled')).toBe(true);
      expect(matchGameday(mockGameday, 'status:completed')).toBe(false);
    });
  });
});
