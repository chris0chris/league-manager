/**
 * Search Engine Utility
 *
 * Provides functionality for parsing search queries with "dork" syntax
 * and matching gameday objects against them.
 */

import type { GamedayListEntry } from '../types';

interface SearchFilters {
  [key: string]: string;
}

interface ParsedQuery {
  text: string;
  filters: SearchFilters;
}

/**
 * Parses a raw search string into text content and specific filters.
 * Example: "final season:2026" -> { text: "final", filters: { season: "2026" } }
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const filters: SearchFilters = {};
  const textParts: string[] = [];

  // Regex to match key:value pairs, supporting quotes
  const regex = /(\w+):(?:"([^"]+)"|(\S+))/g;
  
  let match;
  let lastIndex = 0;

  // Extract all filters
  while ((match = regex.exec(query)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] || match[3];
    filters[key] = value;

    // Add text before this match
    const preText = query.slice(lastIndex, match.index).trim();
    if (preText) textParts.push(preText);
    
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  const remaining = query.slice(lastIndex).trim();
  if (remaining) textParts.push(remaining);

  return {
    text: textParts.join(' '),
    filters
  };
}

/**
 * Checks if a gameday matches the given search query.
 */
export function matchGameday(gameday: GamedayListEntry, query: string): boolean {
  if (!query) return true;

  const { text, filters } = parseSearchQuery(query);

  // Check text match (wildcard on name, league, address)
  if (text) {
    const lowerText = text.toLowerCase();
    const matchesText = 
      gameday.name.toLowerCase().includes(lowerText) ||
      (gameday.league_display?.toLowerCase() || '').includes(lowerText) ||
      (gameday.address?.toLowerCase() || '').includes(lowerText);
    
    if (!matchesText) return false;
  }

  // Check specific filters
  for (const [key, value] of Object.entries(filters)) {
    const lowerValue = value.toLowerCase();
    let matchesFilter = false;

    switch (key) {
      case 'season':
        matchesFilter = (gameday.season_display?.toLowerCase() || '').includes(lowerValue);
        break;
      case 'league':
        matchesFilter = (gameday.league_display?.toLowerCase() || '').includes(lowerValue);
        break;
      case 'status':
        matchesFilter = gameday.status.toLowerCase() === lowerValue;
        break;
      case 'author':
        matchesFilter = (gameday.author_display?.toLowerCase() || '').includes(lowerValue);
        break;
      case 'id':
        matchesFilter = gameday.id.toString() === lowerValue;
        break;
      default:
        // Unknown filter key - ignore or treat as false? 
        // Let's treat as false to be strict
        matchesFilter = false;
    }

    if (!matchesFilter) return false;
  }

  return true;
}
