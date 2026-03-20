import { describe, it, expect } from 'vitest';
import { calculateRanking } from '../rankingEngine';
import type { GameNode } from '../../types/flowchart';

describe('rankingEngine', () => {
  const createMockGame = (id: string, homeId: string | null, awayId: string | null, standing: string): GameNode => ({
    id,
    type: 'game',
    position: { x: 0, y: 0 },
    data: {
      type: 'game',
      stage: 'Preliminary',
      stageType: 'RANKING',
      standing,
      fieldId: 'field-1',
      official: null,
      breakAfter: 0,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeTeamDynamic: null,
      awayTeamDynamic: null,
    },
  });

  it('calculates ranking based on team appearances (placeholder for actual results)', () => {
    // Since we are in the DESIGN phase, we don't have actual scores.
    // However, a RANKING stage needs to know which teams are in it.
    // In the designer, the "ranking" is just the set of unique teams assigned to games in that stage.
    // The actual order (1st, 2nd) is usually determined by the team index in the group if RR,
    // or we might need a way for the user to specify the mapping if it's a complex stage.
    
    // For now, let's assume the ranking engine just extracts all unique teams in that stage.
    
    const games = [
      createMockGame('g1', 'team-1', 'team-2', 'Game 1'),
      createMockGame('g2', 'team-3', 'team-1', 'Game 2'),
    ];
    
    const ranking = calculateRanking(games);
    
    expect(ranking).toContain('team-1');
    expect(ranking).toContain('team-2');
    expect(ranking).toContain('team-3');
    expect(ranking.length).toBe(3);
  });
});
