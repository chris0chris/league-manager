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

  // Create team indices array
  // For odd counts, we put the dummy team at index 0 and it stays fixed during rotation.
  // This results in Round 1 having Team 1 vs Team 2 as the first game.
  const teams = isOdd 
    ? [teamCount, ...Array.from({ length: teamCount }, (_, i) => i)]
    : Array.from({ length: teamCount }, (_, i) => i);

  for (let cycle = 0; cycle < cycles; cycle++) {
    const cycleTeams = [...teams];
    for (let round = 0; round < roundsPerCycle; round++) {
      for (let i = 0; i < Math.floor(adjustedTeamCount / 2); i++) {
        const team1Index = i;
        const team2Index = adjustedTeamCount - 1 - i;
        const team1 = cycleTeams[team1Index];
        const team2 = cycleTeams[team2Index];

        // dummyIndex is always teamCount
        const dummyIndex = teamCount;
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
