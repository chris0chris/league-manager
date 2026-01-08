/**
 * Round Robin Utility Logic
 * 
 * Provides pure functional circular rotation algorithm for 
 * consistent game generation and team assignment.
 */

/**
 * Generates round robin pairings using the circular rotation algorithm.
 * 
 * @param teamCount - Number of teams
 * @param doubleRound - Whether to play home and away
 * @returns Array of [homeIndex, awayIndex] pairs (0-based)
 */
export function getRoundRobinPairings(
  teamCount: number,
  doubleRound: boolean = false
): Array<[number, number]> {
  const pairings: Array<[number, number]> = [];
  
  if (teamCount < 2) return [];

  const isOdd = teamCount % 2 === 1;
  const adjustedTeamCount = isOdd ? teamCount + 1 : teamCount;
  const roundsPerCycle = adjustedTeamCount - 1;
  const cycles = doubleRound ? 2 : 1;

  // Create team indices array (0 to adjustedTeamCount-1)
  // For odd counts, adjustedTeamCount-1 is the 'dummy' team index
  const teams = Array.from({ length: adjustedTeamCount }, (_, i) => i);

  for (let cycle = 0; cycle < cycles; cycle++) {
    const cycleTeams = [...teams];
    for (let round = 0; round < roundsPerCycle; round++) {
      for (let i = 0; i < Math.floor(adjustedTeamCount / 2); i++) {
        const team1Index = i;
        const team2Index = adjustedTeamCount - 1 - i;
        const team1 = cycleTeams[team1Index];
        const team2 = cycleTeams[team2Index];

        // Skip if either team is the dummy (the last index in teams array for odd counts)
        const dummyIndex = teamCount; // index of dummy team
        if (team1 === dummyIndex || team2 === dummyIndex) continue;

        // In second cycle, swap home/away
        if (cycle === 1) {
          pairings.push([team2, team1]);
        } else {
          pairings.push([team1, team2]);
        }
      }

      // Rotate teams (keep first team fixed, move others)
      const lastTeam = cycleTeams.pop()!;
      cycleTeams.splice(1, 0, lastTeam);
    }
  }

  return pairings;
}
