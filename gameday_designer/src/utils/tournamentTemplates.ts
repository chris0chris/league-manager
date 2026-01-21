/**
 * Tournament Templates
 *
 * Predefined tournament formats for different team counts.
 * Each template defines the complete structure: fields, stages, and progression modes.
 */

import { TournamentTemplate } from '../types/tournament';
import { DEFAULT_START_TIME, DEFAULT_GAME_DURATION } from './tournamentConstants';

/**
 * F6-2-2 Format: 6 Teams - 2 Groups of 3
 *
 * Structure:
 * - Group Stage: 2 groups of 3 teams (round robin)
 * - Semifinals: Top 2 from each group (4 teams, single elimination)
 * - 3rd Place Match: Losers of semifinals
 */
export const TEMPLATE_F6_2_2: TournamentTemplate = {
  id: 'F6-2-2',
  name: '6 Teams - 2 Groups of 3',
  teamCount: { min: 6, max: 6, exact: 6 },
  fieldOptions: [1, 2],
  stages: [
    {
      name: 'Group Stage',
      category: 'preliminary',
      progressionMode: 'round_robin',
      config: { mode: 'round_robin', teamCount: 3, doubleRound: false },
      fieldAssignment: 'split', // Group A → Field 1, Group B → Field 2
      splitCount: 2,
    },
    {
      name: 'Playoffs',
      category: 'final',
      progressionMode: 'placement',
      config: { mode: 'placement', positions: 4, format: 'single_elimination' },
      fieldAssignment: 0, // All playoff games on Field 1
      progressionMapping: {
        'SF1': {
          home: { sourceIndex: 0, type: 'winner' },
          away: { sourceIndex: 3, type: 'winner' }
        },
        'SF2': {
          home: { sourceIndex: 2, type: 'winner' },
          away: { sourceIndex: 5, type: 'winner' }
        }
      }
    },
  ],
  timing: {
    firstGameStartTime: DEFAULT_START_TIME,
    defaultGameDuration: DEFAULT_GAME_DURATION,
    defaultBreakBetweenGames: 10,
  },
};

/**
 * F8-2-3 Format: 8 Teams - 2 Groups of 4
 *
 * Structure:
 * - Group Stage: 2 groups of 4 teams (round robin)
 * - Playoffs: All 8 teams in placement bracket
 * - 3rd/5th Place: Consolation matches
 */
export const TEMPLATE_F8_2_3: TournamentTemplate = {
  id: 'F8-2-3',
  name: '8 Teams - 2 Groups of 4',
  teamCount: { min: 8, max: 8, exact: 8 },
  fieldOptions: [1, 2, 3],
  stages: [
    {
      name: 'Group Stage',
      category: 'preliminary',
      progressionMode: 'round_robin',
      config: { mode: 'round_robin', teamCount: 4, doubleRound: false },
      fieldAssignment: 'split',
      splitCount: 2,
    },
    {
      name: 'Playoffs',
      category: 'final',
      progressionMode: 'placement',
      config: { mode: 'placement', positions: 8, format: 'single_elimination' },
      fieldAssignment: 'all',
      progressionMapping: {
        'QF1': {
          home: { sourceIndex: 0, type: 'winner' },
          away: { sourceIndex: 6, type: 'winner' }
        },
        'QF2': {
          home: { sourceIndex: 1, type: 'winner' },
          away: { sourceIndex: 7, type: 'winner' }
        },
        'QF3': {
          home: { sourceIndex: 2, type: 'winner' },
          away: { sourceIndex: 8, type: 'winner' }
        },
        'QF4': {
          home: { sourceIndex: 3, type: 'winner' },
          away: { sourceIndex: 9, type: 'winner' }
        }
      }
    },
    {
      name: '3rd/5th Place',
      category: 'placement',
      progressionMode: 'placement',
      config: { mode: 'placement', positions: 4, format: 'single_elimination' },
      fieldAssignment: 1,
      progressionMapping: {
        'SF1': { // Using SF1 label for consolation semi
          home: { sourceIndex: 4, type: 'loser' },
          away: { sourceIndex: 5, type: 'loser' }
        }
      }
    },
  ],
  timing: {
    firstGameStartTime: DEFAULT_START_TIME,
    defaultGameDuration: DEFAULT_GAME_DURATION,
    defaultBreakBetweenGames: 10,
  },
};

/**
 * Get all available tournament templates
 */
export function getAllTemplates(): TournamentTemplate[] {
  return [TEMPLATE_F6_2_2, TEMPLATE_F8_2_3];
}

/**
 * Get tournament templates that support a specific team count
 *
 * @param teamCount - Number of teams
 * @returns Array of compatible templates
 */
export function getTemplatesForTeamCount(teamCount: number): TournamentTemplate[] {
  return getAllTemplates().filter(
    (t) => teamCount >= t.teamCount.min && teamCount <= t.teamCount.max
  );
}
