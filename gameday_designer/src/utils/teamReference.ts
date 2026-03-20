/**
 * Team Reference Formatting and Parsing Utilities
 *
 * These utilities handle conversion between the structured TeamReference type
 * and the string format used in schedule JSON files.
 *
 * Supported formats:
 * - Group-Team: "0_1" (group 0, team 1)
 * - Standing: "P2 Gruppe 1" (place 2 in Gruppe 1)
 * - Winner: "Gewinner HF1" (winner of match HF1)
 * - Loser: "Verlierer Spiel 3" (loser of Spiel 3)
 * - Static: "Team Officials" (literal team name)
 */

import type { TeamReference } from '../types/designer';
import i18n from '../i18n/config';

/**
 * Formats a TeamReference object into its string representation.
 *
 * @param ref - The team reference to format
 * @returns The string representation of the team reference
 *
 * @example
 * formatTeamReference({ type: 'groupTeam', group: 0, team: 1 }); // "0_1"
 * formatTeamReference({ type: 'standing', place: 2, groupName: 'Gruppe 1' }); // "P2 Gruppe 1"
 * formatTeamReference({ type: 'winner', matchName: 'HF1' }); // "Gewinner HF1"
 * formatTeamReference({ type: 'loser', matchName: 'Spiel 3' }); // "Verlierer Spiel 3"
 * formatTeamReference({ type: 'static', name: 'Team Officials' }); // "Team Officials"
 */
export function formatTeamReference(ref: TeamReference | string): string {
  if (typeof ref === 'string') {
    return ref;
  }
  if (!ref) {
    return '';
  }
  switch (ref.type) {
    case 'groupTeam':
      return `${ref.group}_${ref.team}`;
    case 'standing':
      return `P${ref.place} ${ref.groupName}`;
    case 'winner':
      return `Gewinner ${ref.matchName}`;
    case 'loser':
      return `Verlierer ${ref.matchName}`;
    case 'rank':
      return `Rank ${ref.place} ${ref.stageName}`;
    case 'groupRank':
      return `Rank ${ref.place} in ${ref.groupName} of ${ref.stageName}`;
    case 'static':
      return ref.name;
    default:
      return '';
  }
}


// Regex patterns for parsing team reference strings
const GROUP_TEAM_PATTERN = /^(\d+)_(\d+)$/;
const STANDING_PATTERN = /^P(\d+)\s+(.+)$/;
const WINNER_PATTERN = /^Gewinner\s+(.+)$/;
const LOSER_PATTERN = /^Verlierer\s+(.+)$/;
const RANK_PATTERN = /^Rank\s+(\d+)\s+(.+)$/;
const GROUP_RANK_PATTERN = /^Rank\s+(\d+)\s+in\s+(.+)\s+of\s+(.+)$/;

/**
 * Parses a team reference string into a TeamReference object.
 *
 * The parsing order is:
 * 1. Group-Team format: "X_Y" where X and Y are integers
 * 2. Standing format: "PX GroupName" where X is an integer
 * 3. Winner format: "Gewinner MatchName"
 * 4. Loser format: "Verlierer MatchName"
 * 5. Rank format: "Rank X StageName"
 * 6. Static: Any other string (fallback)
 *
 * @param str - The string to parse
 * @returns The parsed TeamReference object
 *
 * @example
 * parseTeamReference("0_1"); // { type: 'groupTeam', group: 0, team: 1 }
 * parseTeamReference("P2 Gruppe 1"); // { type: 'standing', place: 2, groupName: 'Gruppe 1' }
 * parseTeamReference("Gewinner HF1"); // { type: 'winner', matchName: 'HF1' }
 * parseTeamReference("Verlierer Spiel 3"); // { type: 'loser', matchName: 'Spiel 3' }
 * parseTeamReference("Rank 1 Preliminary"); // { type: 'rank', place: 1, stageName: 'Preliminary', stageId: '' }
 * parseTeamReference("Team Officials"); // { type: 'static', name: 'Team Officials' }
 */
export function parseTeamReference(str: string): TeamReference {
  // Try group-team format: "0_1", "1_2", etc.
  const groupTeamMatch = str.match(GROUP_TEAM_PATTERN);
  if (groupTeamMatch) {
    return {
      type: 'groupTeam',
      group: parseInt(groupTeamMatch[1], 10),
      team: parseInt(groupTeamMatch[2], 10),
    };
  }

  // Try standing format: "P1 Gruppe 1", "P2 Pool A", etc.
  const standingMatch = str.match(STANDING_PATTERN);
  if (standingMatch) {
    return {
      type: 'standing',
      place: parseInt(standingMatch[1], 10),
      groupName: standingMatch[2],
    };
  }

  // Try winner format: "Gewinner HF1", "Gewinner Spiel 3", etc.
  const winnerMatch = str.match(WINNER_PATTERN);
  if (winnerMatch) {
    return {
      type: 'winner',
      matchName: winnerMatch[1],
    };
  }

  // Try loser format: "Verlierer HF1", "Verlierer Spiel 3", etc.
  const loserMatch = str.match(LOSER_PATTERN);
  if (loserMatch) {
    return {
      type: 'loser',
      matchName: loserMatch[1],
    };
  }

  // Try rank format: "Rank 1 Preliminary", etc.
  const rankMatch = str.match(RANK_PATTERN);
  if (rankMatch) {
    // Try group-rank first as it is more specific
    const groupRankMatch = str.match(GROUP_RANK_PATTERN);
    if (groupRankMatch) {
      return {
        type: 'groupRank',
        place: parseInt(groupRankMatch[1], 10),
        groupName: groupRankMatch[2],
        stageName: groupRankMatch[3],
        stageId: '',
      };
    }

    return {
      type: 'rank',
      place: parseInt(rankMatch[1], 10),
      stageName: rankMatch[2],
      stageId: '', // Note: stageId cannot be recovered from string format alone
    };
  }

  // Default to static reference
  return {
    type: 'static',
    name: str,
  };
}

/**
 * Checks if two team references are equivalent.
 *
 * @param ref1 - First team reference
 * @param ref2 - Second team reference
 * @returns true if the references represent the same team
 */
export function areTeamReferencesEqual(
  ref1: TeamReference,
  ref2: TeamReference
): boolean {
  return formatTeamReference(ref1) === formatTeamReference(ref2);
}

/**
 * Gets a human-readable display name for a team reference.
 * 
 * @param ref - The team reference
 * @returns A human-readable string
 */
export function getTeamReferenceDisplayName(ref: TeamReference): string {
  switch (ref.type) {
    case 'groupTeam':
      return `${ref.group}_${ref.team}`;
    case 'standing':
      return `P${ref.place} ${ref.groupName}`;
    case 'winner':
      return `${i18n.t('ui:label.winner')} ${ref.matchName}`;
    case 'loser':
      return `${i18n.t('ui:label.loser')} ${ref.matchName}`;
    case 'rank':
      return `${i18n.t('ui:label.rank')} ${ref.place} ${ref.stageName}`;
    case 'groupRank':
      return `${i18n.t('ui:label.rank')} ${ref.place} ${i18n.t('ui:label.in')} ${ref.groupName} ${i18n.t('ui:label.of')} ${ref.stageName}`;
    case 'static':
      return ref.name;
  }
}
