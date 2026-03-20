/**
 * Complete integration test for tournament generation and validation
 */

import { describe, it, expect } from 'vitest';
import { generateTournament } from '../tournamentGenerator';
import { assignTeamsToTournamentGames } from '../teamAssignment';
import { TEMPLATE_F6_2_2 } from '../tournamentTemplates';
import type { GlobalTeam } from '../../types/flowchart';

describe('Tournament Generation - 6 Teams Integration', () => {
  const teams: GlobalTeam[] = [
    { id: 'team-1', label: 'Team 1', color: '#3498db', order: 0, groupId: 'g1' },
    { id: 'team-2', label: 'Team 2', color: '#e74c3c', order: 1, groupId: 'g1' },
    { id: 'team-3', label: 'Team 3', color: '#2ecc71', order: 2, groupId: 'g1' },
    { id: 'team-4', label: 'Team 4', color: '#f39c12', order: 3, groupId: 'g1' },
    { id: 'team-5', label: 'Team 5', color: '#9b59b6', order: 4, groupId: 'g1' },
    { id: 'team-6', label: 'Team 6', color: '#1abc9c', order: 5, groupId: 'g1' },
  ];

  it('should generate a valid 6-team tournament with 2 groups and complete assignments', () => {
    // 1. Generate tournament structure
    const structure = generateTournament(teams, {
      template: TEMPLATE_F6_2_2,
      fieldCount: 1,
      startTime: '10:00',
    });

    // 2. Validate stages (should have 2 Group Stages + 1 Playoffs)
    const groupStages = structure.stages.filter(s => s.data.name.includes('Group Stage'));
    expect(groupStages).toHaveLength(2);
    expect(groupStages[0].data.name).toBe('Group Stage A');
    expect(groupStages[1].data.name).toBe('Group Stage B');

    const playoffStages = structure.stages.filter(s => s.data.name.includes('Playoffs'));
    expect(playoffStages).toHaveLength(1);

    // 3. Validate game count (3 games per RR group + 4 playoff games = 10)
    expect(structure.games).toHaveLength(10);

    // 4. Generate and apply team assignments
    const operations = assignTeamsToTournamentGames(structure, teams);
    
    // Create copies of nodes and edges to simulate state updates
    const finalGames = [...structure.games];
    const finalEdges = [...structure.edges];

    operations.forEach(op => {
      if (op.type === 'assign_team') {
        const gameIndex = finalGames.findIndex(g => g.id === op.gameId);
        if (gameIndex !== -1) {
          const game = finalGames[gameIndex];
          finalGames[gameIndex] = {
            ...game,
            data: {
              ...game.data,
              [op.slot === 'home' ? 'homeTeamId' : 'awayTeamId']: op.teamId
            }
          };
        }
      } else if (op.type === 'add_edges') {
        op.edges.forEach(edgeSpec => {
          finalEdges.push({
            id: `edge-${edgeSpec.sourceGameId}-${edgeSpec.targetGameId}`,
            source: edgeSpec.sourceGameId,
            target: edgeSpec.targetGameId,
            sourceHandle: edgeSpec.outputType,
            targetHandle: edgeSpec.targetSlot
          });
        });
      }
    });

    // 5. Final Validation: Every game must have both inputs satisfied
    // A game is satisfied if it has:
    // - Direct team assignment (homeTeamId / awayTeamId)
    // - OR an incoming edge
    // - OR a dynamic reference property (homeTeamDynamic / awayTeamDynamic)
    finalGames.forEach(game => {
      const hasHome = !!(
        game.data.homeTeamId || 
        game.data.homeTeamDynamic || 
        finalEdges.some(e => e.target === game.id && e.targetHandle === 'home')
      );
      const hasAway = !!(
        game.data.awayTeamId || 
        game.data.awayTeamDynamic || 
        finalEdges.some(e => e.target === game.id && e.targetHandle === 'away')
      );

      if (!hasHome || !hasAway) {
        console.error(`Incomplete game: ${game.data.standing}`, { hasHome, hasAway });
      }

      expect(hasHome, `Game ${game.data.standing} missing home team`).toBe(true);
      expect(hasAway, `Game ${game.data.standing} missing away team`).toBe(true);
    });
  });
});
