/**
 * Integration tests for Tournament Generator timing logic
 */

import { describe, it, expect } from 'vitest';
import { generateTournament } from '../tournamentGenerator';
import type { TournamentTemplate, TournamentGenerationConfig } from '../../types/tournament';
import type { GlobalTeam } from '../../types/flowchart';

describe('tournamentGenerator - Timing Integration', () => {
  const sampleTeams: GlobalTeam[] = [
    { id: 't1', label: 'Team 1', groupId: null, order: 0 },
    { id: 't2', label: 'Team 2', groupId: null, order: 1 },
  ];

  const simpleTemplate: TournamentTemplate = {
    id: 'T2',
    name: '2 Teams',
    teamCount: { min: 2, max: 2, exact: 2 },
    fieldOptions: [1],
    stages: [
      {
        name: 'Group Stage',
        stageType: 'vorrunde',
        progressionMode: 'round_robin',
        config: { mode: 'round_robin', teamCount: 2, doubleRound: true }, // 2 games
        fieldAssignment: 0,
      }
    ],
    timing: {
      firstGameStartTime: '10:00',
      defaultGameDuration: 60,
      defaultBreakBetweenGames: 10,
    },
  };

  it('should support 0-minute break duration', () => {
    const config: TournamentGenerationConfig = {
      template: simpleTemplate,
      fieldCount: 1,
      startTime: '10:00',
      gameDuration: 60,
      breakDuration: 0, // <--- IMPORTANT: Test 0 value
    };

    const result = generateTournament(sampleTeams, config);

    // Game 1: 10:00
    // Game 2: 10:00 + 60m + 0m = 11:00
    expect(result.games).toHaveLength(2);
    expect(result.games[0].data.startTime).toBe('10:00');
    expect(result.games[1].data.startTime).toBe('11:00');
  });

  it('should use default break if breakDuration is undefined', () => {
    const config: TournamentGenerationConfig = {
      template: simpleTemplate,
      fieldCount: 1,
      startTime: '10:00',
      gameDuration: 60,
      // breakDuration is undefined
    };

    const result = generateTournament(sampleTeams, config);

    // Game 1: 10:00
    // Game 2: 10:00 + 60m + 10m (default) = 11:10
    expect(result.games[0].data.startTime).toBe('10:00');
    expect(result.games[1].data.startTime).toBe('11:10');
  });
});
