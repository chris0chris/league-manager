/**
 * Time Calculation Tests
 *
 * Tests for automatic game time calculation during tournament generation.
 * Games should have start times calculated based on:
 * - First game start time
 * - Game duration
 * - Break between games
 * - Field assignments (parallel games on different fields)
 */

import { describe, it, expect } from 'vitest';
import { calculateGameTimes, addMinutesToTime, getStageEndTime } from '../timeCalculation';
import { createStageNode, createFieldNode } from '../../types/flowchart';
import type { GameNode } from '../../types/flowchart';

// Helper to create a mock game node
function createMockGameNode(
  id: string,
  parentId: string,
  standing: string,
  duration: number = 50
): GameNode {
  return {
    id,
    type: 'game',
    parentId,
    position: { x: 0, y: 0 },
    data: {
      type: 'game',
      stage: 'Test Stage',
      standing,
      fieldId: null,
      official: null,
      breakAfter: 0,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamDynamic: null,
      awayTeamDynamic: null,
      duration,
      startTime: undefined,
      manualTime: false,
    },
  };
}

describe('timeCalculation - addMinutesToTime', () => {
  it('should add minutes to a time string', () => {
    expect(addMinutesToTime('09:00', 50)).toBe('09:50');
    expect(addMinutesToTime('09:30', 30)).toBe('10:00');
    expect(addMinutesToTime('23:30', 45)).toBe('00:15');
  });

  it('should handle hour rollover correctly', () => {
    expect(addMinutesToTime('09:45', 30)).toBe('10:15');
    expect(addMinutesToTime('11:55', 10)).toBe('12:05');
  });

  it('should handle midnight rollover', () => {
    expect(addMinutesToTime('23:45', 30)).toBe('00:15');
    expect(addMinutesToTime('23:00', 90)).toBe('00:30');
  });

  it('should handle zero minutes', () => {
    expect(addMinutesToTime('09:00', 0)).toBe('09:00');
  });
});

describe('timeCalculation - getStageEndTime', () => {
  it('should calculate end time for single game', () => {
    const stageId = 'stage-1';
    const fieldId = 'field-1';

    const stage = createStageNode(stageId, fieldId, {
      name: 'Test Stage',
      stageType: 'vorrunde',
      order: 0,
      startTime: '09:00',
      defaultGameDuration: 50,
    });

    const game1 = createMockGameNode('game-1', stageId, 'Game 1', 50);
    const games = [game1];

    const endTime = getStageEndTime(stage, games, 10);

    // 09:00 + 50 minutes = 09:50 (break not added after last game)
    expect(endTime).toBe('09:50');
  });

  it('should calculate end time for multiple sequential games', () => {
    const stageId = 'stage-1';
    const fieldId = 'field-1';

    const stage = createStageNode(stageId, fieldId, {
      name: 'Test Stage',
      stageType: 'vorrunde',
      order: 0,
      startTime: '09:00',
      defaultGameDuration: 50,
    });

    const games = [
      createMockGameNode('game-1', stageId, 'Game 1', 50),
      createMockGameNode('game-2', stageId, 'Game 2', 50),
      createMockGameNode('game-3', stageId, 'Game 3', 50),
    ];

    const endTime = getStageEndTime(stage, games, 10);

    // 09:00 + (50 + 10) + (50 + 10) + 50 = 09:00 + 170 = 11:50
    expect(endTime).toBe('11:50');
  });

  it('should handle custom game durations', () => {
    const stageId = 'stage-1';
    const fieldId = 'field-1';

    const stage = createStageNode(stageId, fieldId, {
      name: 'Test Stage',
      stageType: 'vorrunde',
      order: 0,
      startTime: '09:00',
      defaultGameDuration: 50,
    });

    const games = [
      createMockGameNode('game-1', stageId, 'Game 1', 60), // Custom duration
      createMockGameNode('game-2', stageId, 'Game 2', 50),
    ];

    const endTime = getStageEndTime(stage, games, 10);

    // 09:00 + (60 + 10) + 50 = 09:00 + 120 = 11:00
    expect(endTime).toBe('11:00');
  });
});

describe('timeCalculation - calculateGameTimes', () => {
  describe('Single field scenarios', () => {
    it('should calculate sequential game times for single field', () => {
      const fieldId = 'field-1';
      const stageId = 'stage-1';

      const field = createFieldNode(fieldId, { name: 'Feld 1', order: 0 });
      const stage = createStageNode(stageId, fieldId, {
        name: 'Group Stage',
        stageType: 'vorrunde',
        order: 0,
        startTime: '09:00',
        defaultGameDuration: 50,
      });

      const games = [
        createMockGameNode('game-1', stageId, 'Game 1', 50),
        createMockGameNode('game-2', stageId, 'Game 2', 50),
        createMockGameNode('game-3', stageId, 'Game 3', 50),
      ];

      const result = calculateGameTimes(
        [field],
        [stage],
        games,
        50,  // game duration
        10   // break duration
      );

      expect(result[0].data.startTime).toBe('09:00');
      expect(result[1].data.startTime).toBe('10:00'); // 09:00 + 50 + 10
      expect(result[2].data.startTime).toBe('11:00'); // 10:00 + 50 + 10
    });

    it('should use game-specific duration when available', () => {
      const fieldId = 'field-1';
      const stageId = 'stage-1';

      const field = createFieldNode(fieldId, { name: 'Feld 1', order: 0 });
      const stage = createStageNode(stageId, fieldId, {
        name: 'Group Stage',
        stageType: 'vorrunde',
        order: 0,
        startTime: '09:00',
        defaultGameDuration: 50,
      });

      const games = [
        createMockGameNode('game-1', stageId, 'Game 1', 60), // Custom 60 min
        createMockGameNode('game-2', stageId, 'Game 2', 50),
      ];

      const result = calculateGameTimes([field], [stage], games, 50, 10);

      expect(result[0].data.startTime).toBe('09:00');
      expect(result[1].data.startTime).toBe('10:10'); // 09:00 + 60 + 10
    });
  });

  describe('Multi-field parallel execution', () => {
    it('should schedule games on different fields in parallel', () => {
      const field1Id = 'field-1';
      const field2Id = 'field-2';
      const stage1Id = 'stage-1';
      const stage2Id = 'stage-2';

      const fields = [
        createFieldNode(field1Id, { name: 'Feld 1', order: 0 }),
        createFieldNode(field2Id, { name: 'Feld 2', order: 1 }),
      ];

      const stages = [
        createStageNode(stage1Id, field1Id, {
          name: 'Group Stage A',
          stageType: 'vorrunde',
          order: 0,
          startTime: '09:00',
          defaultGameDuration: 50,
        }),
        createStageNode(stage2Id, field2Id, {
          name: 'Group Stage B',
          stageType: 'vorrunde',
          order: 0, // Same order = parallel execution
          startTime: '09:00',
          defaultGameDuration: 50,
        }),
      ];

      const games = [
        // Field 1 games
        createMockGameNode('game-1', stage1Id, 'Game 1', 50),
        createMockGameNode('game-2', stage1Id, 'Game 2', 50),
        createMockGameNode('game-3', stage1Id, 'Game 3', 50),
        // Field 2 games
        createMockGameNode('game-4', stage2Id, 'Game 4', 50),
        createMockGameNode('game-5', stage2Id, 'Game 5', 50),
        createMockGameNode('game-6', stage2Id, 'Game 6', 50),
      ];

      const result = calculateGameTimes(fields, stages, games, 50, 10);

      // Field 1 games
      expect(result[0].data.startTime).toBe('09:00');
      expect(result[1].data.startTime).toBe('10:00');
      expect(result[2].data.startTime).toBe('11:00');

      // Field 2 games (parallel start times)
      expect(result[3].data.startTime).toBe('09:00');
      expect(result[4].data.startTime).toBe('10:00');
      expect(result[5].data.startTime).toBe('11:00');
    });

    it('should handle subsequent stages starting after previous stage finishes', () => {
      const field1Id = 'field-1';
      const field2Id = 'field-2';
      const groupStage1Id = 'stage-group-1';
      const groupStage2Id = 'stage-group-2';
      const playoffStage1Id = 'stage-playoff-1';
      const playoffStage2Id = 'stage-playoff-2';

      const fields = [
        createFieldNode(field1Id, { name: 'Feld 1', order: 0 }),
        createFieldNode(field2Id, { name: 'Feld 2', order: 1 }),
      ];

      const stages = [
        // Group stages (order 0, parallel)
        createStageNode(groupStage1Id, field1Id, {
          name: 'Group A',
          stageType: 'vorrunde',
          order: 0,
          startTime: '09:00',
          defaultGameDuration: 50,
        }),
        createStageNode(groupStage2Id, field2Id, {
          name: 'Group B',
          stageType: 'vorrunde',
          order: 0,
          startTime: '09:00',
          defaultGameDuration: 50,
        }),
        // Playoff stages (order 1, parallel, start after group stages)
        createStageNode(playoffStage1Id, field1Id, {
          name: 'Playoffs',
          stageType: 'finalrunde',
          order: 1,
          defaultGameDuration: 50,
        }),
        createStageNode(playoffStage2Id, field2Id, {
          name: 'Playoffs',
          stageType: 'finalrunde',
          order: 1,
          defaultGameDuration: 50,
        }),
      ];

      const games = [
        // Group stage games (3 games per field)
        createMockGameNode('group-1', groupStage1Id, 'G1', 50),
        createMockGameNode('group-2', groupStage1Id, 'G2', 50),
        createMockGameNode('group-3', groupStage1Id, 'G3', 50),
        createMockGameNode('group-4', groupStage2Id, 'G4', 50),
        createMockGameNode('group-5', groupStage2Id, 'G5', 50),
        createMockGameNode('group-6', groupStage2Id, 'G6', 50),
        // Playoff games (2 games per field)
        createMockGameNode('playoff-1', playoffStage1Id, 'SF1', 50),
        createMockGameNode('playoff-2', playoffStage1Id, 'Final', 50),
        createMockGameNode('playoff-3', playoffStage2Id, 'SF2', 50),
        createMockGameNode('playoff-4', playoffStage2Id, '3rd Place', 50),
      ];

      const result = calculateGameTimes(fields, stages, games, 50, 10);

      // Group stage ends at 11:50 (last game ends, no break after)
      // Playoff stage starts at 12:00 (after 10 min break)

      // Playoff games should start at 12:00
      expect(result[6].data.startTime).toBe('12:00'); // SF1
      expect(result[7].data.startTime).toBe('13:00'); // Final
      expect(result[8].data.startTime).toBe('12:00'); // SF2 (parallel)
      expect(result[9].data.startTime).toBe('13:00'); // 3rd Place (parallel)
    });
  });

  describe('Edge cases', () => {
    it('should handle empty game list', () => {
      const field = createFieldNode('field-1', { name: 'Feld 1', order: 0 });
      const stage = createStageNode('stage-1', 'field-1', {
        name: 'Empty Stage',
        stageType: 'vorrunde',
        order: 0,
        startTime: '09:00',
        defaultGameDuration: 50,
      });

      const result = calculateGameTimes([field], [stage], [], 50, 10);

      expect(result).toEqual([]);
    });

    it('should handle stage without explicit startTime', () => {
      const fieldId = 'field-1';
      const stageId = 'stage-1';

      const field = createFieldNode(fieldId, { name: 'Feld 1', order: 0 });
      const stage = createStageNode(stageId, fieldId, {
        name: 'Group Stage',
        stageType: 'vorrunde',
        order: 0,
        // No explicit startTime - should use default '09:00'
        defaultGameDuration: 50,
      });

      const games = [
        createMockGameNode('game-1', stageId, 'Game 1', 50),
      ];

      const result = calculateGameTimes([field], [stage], games, 50, 10);

      // Should default to 09:00 if no startTime specified
      expect(result[0].data.startTime).toBe('09:00');
    });

    it('should not override manually set times', () => {
      const fieldId = 'field-1';
      const stageId = 'stage-1';

      const field = createFieldNode(fieldId, { name: 'Feld 1', order: 0 });
      const stage = createStageNode(stageId, fieldId, {
        name: 'Group Stage',
        stageType: 'vorrunde',
        order: 0,
        startTime: '09:00',
        defaultGameDuration: 50,
      });

      const games = [
        createMockGameNode('game-1', stageId, 'Game 1', 50),
        {
          ...createMockGameNode('game-2', stageId, 'Game 2', 50),
          data: {
            ...createMockGameNode('game-2', stageId, 'Game 2', 50).data,
            startTime: '15:00',
            manualTime: true, // Manually set time
          },
        },
        createMockGameNode('game-3', stageId, 'Game 3', 50),
      ];

      const result = calculateGameTimes([field], [stage], games, 50, 10);

      expect(result[0].data.startTime).toBe('09:00');
      expect(result[1].data.startTime).toBe('15:00'); // Should preserve manual time
      expect(result[2].data.startTime).toBe('16:00'); // Should continue from manual time
    });
  });
});
