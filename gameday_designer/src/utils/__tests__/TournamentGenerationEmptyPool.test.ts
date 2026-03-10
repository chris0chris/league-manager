import { describe, it, expect } from 'vitest';
import { generateTournament } from '../tournamentGenerator';
import { assignTeamsToTournamentGames, generateTeamsForTournament } from '../teamAssignment';
import type { TournamentTemplate, TournamentGenerationConfig } from '../../types/tournament';
import type { GlobalTeam } from '../../types/flowchart';

describe('Tournament Generation with Empty Initial Pool (#697)', () => {
  const templateF6: TournamentTemplate = {
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
        fieldAssignment: 'split',
        splitCount: 2,
      },
      {
        name: 'Playoffs',
        category: 'final',
        progressionMode: 'placement',
        config: { mode: 'placement', positions: 4, format: 'single_elimination' },
        fieldAssignment: 0,
      }
    ],
    timing: {
      firstGameStartTime: '10:00',
      defaultGameDuration: 30,
      defaultBreakBetweenGames: 5,
    },
  };

  it('TDD RED: should correctly group teams in split stages when pool was initially empty', () => {
    // Simulate generated teams (what useDesignerController does)
    const teamCount = 6;
    const teamData = generateTeamsForTournament(teamCount);
    const generatedTeams: GlobalTeam[] = teamData.map((data, i) => ({
        id: `t${i+1}`,
        label: data.label,
        color: data.color,
        groupId: 'tournament-group',
        order: i
    }));

    const config: TournamentGenerationConfig = {
      template: templateF6,
      fieldCount: 2,
      startTime: '10:00',
    };

    // 1. Generate Structure
    const structure = generateTournament(generatedTeams, config);

    // Verify 2 stages in order 0 (split)
    const groupStages = structure.stages.filter(s => s.data.order === 0);
    expect(groupStages).toHaveLength(2);
    expect(groupStages[0].data.name).toBe('Group Stage A');
    expect(groupStages[1].data.name).toBe('Group Stage B');

    // 2. Assign Teams
    const operations = assignTeamsToTournamentGames(structure, generatedTeams);

    // Verify assignments for Group Stage A (should have Team 1, 2, 3)
    const stageAGames = structure.games.filter(g => g.parentId === groupStages[0].id);
    const stageBGames = structure.games.filter(g => g.parentId === groupStages[1].id);

    const teamIdsInA = new Set(operations
        .filter(op => op.type === 'assign_team' && stageAGames.some(g => g.id === op.gameId))
        .map(op => (op as { teamId: string }).teamId));
    
    const teamIdsInB = new Set(operations
        .filter(op => op.type === 'assign_team' && stageBGames.some(g => g.id === op.gameId))
        .map(op => (op as { teamId: string }).teamId));

    // Group A should have teams t1, t2, t3
    expect(teamIdsInA).toContain('t1');
    expect(teamIdsInA).toContain('t2');
    expect(teamIdsInA).toContain('t3');
    expect(teamIdsInA).not.toContain('t4');

    // Group B should have teams t4, t5, t6
    expect(teamIdsInB).toContain('t4');
    expect(teamIdsInB).toContain('t5');
    expect(teamIdsInB).toContain('t6');
    expect(teamIdsInB).not.toContain('t1');
  });
});