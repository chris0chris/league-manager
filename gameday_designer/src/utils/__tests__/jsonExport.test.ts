import { describe, it, expect, vi } from 'vitest';
import { exportToJson, importFromJson, validateScheduleJson, generateExportFilename, downloadScheduleJson } from '../jsonExport';
import type { DesignerState, Field, GameSlot, ScheduleJson } from '../../types/designer';

describe('exportToJson', () => {
  describe('empty state', () => {
    it('exports empty state as empty array', () => {
      const state: DesignerState = {
        fields: [],
        selectedGameSlot: null,
        validationResult: { isValid: true, errors: [], warnings: [] },
      };

      const result = exportToJson(state);

      expect(result).toEqual([]);
    });
  });

  describe('basic export', () => {
    it('exports a single field with one game', () => {
      const state: DesignerState = {
        fields: [
          {
            id: 'field-1',
            name: 'Feld 1',
            order: 0,
            gameSlots: [
              {
                id: 'slot-1',
                stage: 'Preliminary',
                standing: 'Spiel 1',
                home: { type: 'groupTeam', group: 0, team: 0 },
                away: { type: 'groupTeam', group: 0, team: 1 },
                official: { type: 'groupTeam', group: 0, team: 2 },
                breakAfter: 0,
              },
            ],
          },
        ],
        selectedGameSlot: null,
        validationResult: { isValid: true, errors: [], warnings: [] },
      };

      const result = exportToJson(state);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('Feld 1');
      expect(result[0].games).toHaveLength(1);
      expect(result[0].games[0]).toEqual({
        stage: 'Preliminary',
        standing: 'Spiel 1',
        home: '0_0',
        away: '0_1',
        official: '0_2',
      });
    });

    it('exports multiple fields with multiple games', () => {
      const state: DesignerState = {
        fields: [
          {
            id: 'field-1',
            name: 'Feld 1',
            order: 0,
            gameSlots: [
              {
                id: 'slot-1',
                stage: 'Preliminary',
                standing: 'Spiel 1',
                home: { type: 'groupTeam', group: 0, team: 0 },
                away: { type: 'groupTeam', group: 0, team: 1 },
                official: { type: 'groupTeam', group: 0, team: 2 },
                breakAfter: 0,
              },
              {
                id: 'slot-2',
                stage: 'Preliminary',
                standing: 'Spiel 2',
                home: { type: 'groupTeam', group: 0, team: 2 },
                away: { type: 'groupTeam', group: 0, team: 3 },
                official: { type: 'groupTeam', group: 0, team: 0 },
                breakAfter: 0,
              },
            ],
          },
          {
            id: 'field-2',
            name: 'Feld 2',
            order: 1,
            gameSlots: [
              {
                id: 'slot-3',
                stage: 'Final',
                standing: 'HF1',
                home: { type: 'winner', matchName: 'Spiel 1' },
                away: { type: 'winner', matchName: 'Spiel 2' },
                official: { type: 'loser', matchName: 'Spiel 1' },
                breakAfter: 0,
              },
            ],
          },
        ],
        selectedGameSlot: null,
        validationResult: { isValid: true, errors: [], warnings: [] },
      };

      const result = exportToJson(state);

      expect(result).toHaveLength(2);
      expect(result[0].games).toHaveLength(2);
      expect(result[1].games).toHaveLength(1);
    });

    it('exports field with empty game slots', () => {
      const state: DesignerState = {
        fields: [
          {
            id: 'field-1',
            name: 'Empty Field',
            order: 0,
            gameSlots: [],
          },
        ],
        selectedGameSlot: null,
        validationResult: { isValid: true, errors: [], warnings: [] },
      };

      const result = exportToJson(state);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('Empty Field');
      expect(result[0].games).toEqual([]);
    });
  });

  describe('team reference formatting', () => {
    it('formats groupTeam references correctly', () => {
      const state = createStateWithGame({
        home: { type: 'groupTeam', group: 1, team: 3 },
        away: { type: 'groupTeam', group: 2, team: 0 },
        official: { type: 'groupTeam', group: 0, team: 1 },
      });

      const result = exportToJson(state);

      expect(result[0].games[0].home).toBe('1_3');
      expect(result[0].games[0].away).toBe('2_0');
      expect(result[0].games[0].official).toBe('0_1');
    });

    it('formats standing references correctly', () => {
      const state = createStateWithGame({
        home: { type: 'standing', place: 1, groupName: 'Gruppe 1' },
        away: { type: 'standing', place: 2, groupName: 'Gruppe 2' },
        official: { type: 'standing', place: 3, groupName: 'Pool A' },
      });

      const result = exportToJson(state);

      expect(result[0].games[0].home).toBe('P1 Gruppe 1');
      expect(result[0].games[0].away).toBe('P2 Gruppe 2');
      expect(result[0].games[0].official).toBe('P3 Pool A');
    });

    it('formats winner references correctly', () => {
      const state = createStateWithGame({
        home: { type: 'winner', matchName: 'HF1' },
        away: { type: 'winner', matchName: 'Spiel 3' },
        official: { type: 'winner', matchName: 'P1 vs P2' },
      });

      const result = exportToJson(state);

      expect(result[0].games[0].home).toBe('Gewinner HF1');
      expect(result[0].games[0].away).toBe('Gewinner Spiel 3');
      expect(result[0].games[0].official).toBe('Gewinner P1 vs P2');
    });

    it('formats loser references correctly', () => {
      const state = createStateWithGame({
        home: { type: 'loser', matchName: 'HF1' },
        away: { type: 'loser', matchName: 'Spiel 3' },
        official: { type: 'loser', matchName: 'Semi' },
      });

      const result = exportToJson(state);

      expect(result[0].games[0].home).toBe('Verlierer HF1');
      expect(result[0].games[0].away).toBe('Verlierer Spiel 3');
      expect(result[0].games[0].official).toBe('Verlierer Semi');
    });

    it('formats static references correctly', () => {
      const state = createStateWithGame({
        home: { type: 'static', name: 'Team A' },
        away: { type: 'static', name: 'Team B' },
        official: { type: 'static', name: 'Team Officials' },
      });

      const result = exportToJson(state);

      expect(result[0].games[0].home).toBe('Team A');
      expect(result[0].games[0].away).toBe('Team B');
      expect(result[0].games[0].official).toBe('Team Officials');
    });
  });

  describe('break_after handling', () => {
    it('omits break_after when it is 0', () => {
      const state = createStateWithGame({ breakAfter: 0 });

      const result = exportToJson(state);

      expect(result[0].games[0]).not.toHaveProperty('break_after');
    });

    it('includes break_after when it is greater than 0', () => {
      const state = createStateWithGame({ breakAfter: 5 });

      const result = exportToJson(state);

      expect(result[0].games[0].break_after).toBe(5);
    });
  });

  describe('compatibility with existing format', () => {
    it('produces JSON compatible with schedule_4_final4_1.json format', () => {
      // Recreate the structure from schedule_4_final4_1.json
      const state: DesignerState = {
        fields: [
          {
            id: 'field-1',
            name: '1',
            order: 0,
            gameSlots: [
              {
                id: 'slot-1',
                stage: 'Preliminary',
                standing: 'Spiel 1',
                home: { type: 'groupTeam', group: 0, team: 0 },
                away: { type: 'groupTeam', group: 0, team: 1 },
                official: { type: 'groupTeam', group: 0, team: 2 },
                breakAfter: 0,
              },
              {
                id: 'slot-2',
                stage: 'Preliminary',
                standing: 'Spiel 2',
                home: { type: 'groupTeam', group: 0, team: 2 },
                away: { type: 'groupTeam', group: 0, team: 3 },
                official: { type: 'groupTeam', group: 0, team: 0 },
                breakAfter: 0,
              },
              {
                id: 'slot-3',
                stage: 'Final',
                standing: 'Spiel 3',
                home: { type: 'loser', matchName: 'Spiel 1' },
                away: { type: 'loser', matchName: 'Spiel 2' },
                official: { type: 'winner', matchName: 'Spiel 1' },
                breakAfter: 0,
              },
              {
                id: 'slot-4',
                stage: 'Final',
                standing: 'Spiel 4',
                home: { type: 'winner', matchName: 'Spiel 1' },
                away: { type: 'winner', matchName: 'Spiel 2' },
                official: { type: 'loser', matchName: 'Spiel 3' },
                breakAfter: 0,
              },
              {
                id: 'slot-5',
                stage: 'Final',
                standing: 'Spiel 5',
                home: { type: 'loser', matchName: 'Spiel 4' },
                away: { type: 'winner', matchName: 'Spiel 3' },
                official: { type: 'loser', matchName: 'Spiel 3' },
                breakAfter: 0,
              },
              {
                id: 'slot-6',
                stage: 'Final',
                standing: 'P1',
                home: { type: 'winner', matchName: 'Spiel 5' },
                away: { type: 'winner', matchName: 'Spiel 4' },
                official: { type: 'loser', matchName: 'Spiel 5' },
                breakAfter: 0,
              },
            ],
          },
        ],
        selectedGameSlot: null,
        validationResult: { isValid: true, errors: [], warnings: [] },
      };

      const result = exportToJson(state);

      // Compare with expected format from schedule_4_final4_1.json
      const expected: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
            {
              stage: 'Preliminary',
              standing: 'Spiel 2',
              home: '0_2',
              away: '0_3',
              official: '0_0',
            },
            {
              stage: 'Final',
              standing: 'Spiel 3',
              home: 'Verlierer Spiel 1',
              away: 'Verlierer Spiel 2',
              official: 'Gewinner Spiel 1',
            },
            {
              stage: 'Final',
              standing: 'Spiel 4',
              home: 'Gewinner Spiel 1',
              away: 'Gewinner Spiel 2',
              official: 'Verlierer Spiel 3',
            },
            {
              stage: 'Final',
              standing: 'Spiel 5',
              home: 'Verlierer Spiel 4',
              away: 'Gewinner Spiel 3',
              official: 'Verlierer Spiel 3',
            },
            {
              stage: 'Final',
              standing: 'P1',
              home: 'Gewinner Spiel 5',
              away: 'Gewinner Spiel 4',
              official: 'Verlierer Spiel 5',
            },
          ],
        },
      ];

      expect(result).toEqual(expected);
    });
  });
});

describe('importFromJson', () => {
  describe('basic import', () => {
    it('imports a single field with one game', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toBe('1');
      expect(result.fields[0].gameSlots).toHaveLength(1);
      expect(result.fields[0].gameSlots[0].stage).toBe('Preliminary');
      expect(result.fields[0].gameSlots[0].standing).toBe('Spiel 1');
    });

    it('imports multiple fields', () => {
      const json: ScheduleJson[] = [
        {
          field: 'Field A',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Game 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
        {
          field: 'Field B',
          games: [
            {
              stage: 'Final',
              standing: 'Final',
              home: 'Gewinner Game 1',
              away: 'P1 Gruppe 1',
              official: 'Team Officials',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('Field A');
      expect(result.fields[1].name).toBe('Field B');
    });

    it('imports empty array as empty state', () => {
      const json: ScheduleJson[] = [];

      const result = importFromJson(json);

      expect(result.fields).toHaveLength(0);
    });
  });

  describe('team reference parsing', () => {
    it('parses groupTeam references correctly', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '1_3',
              away: '2_0',
              official: '0_1',
            },
          ],
        },
      ];

      const result = importFromJson(json);
      const slot = result.fields[0].gameSlots[0];

      expect(slot.home).toEqual({ type: 'groupTeam', group: 1, team: 3 });
      expect(slot.away).toEqual({ type: 'groupTeam', group: 2, team: 0 });
      expect(slot.official).toEqual({ type: 'groupTeam', group: 0, team: 1 });
    });

    it('parses standing references correctly', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Final',
              standing: 'HF1',
              home: 'P1 Gruppe 1',
              away: 'P2 Gruppe 2',
              official: 'P3 Pool A',
            },
          ],
        },
      ];

      const result = importFromJson(json);
      const slot = result.fields[0].gameSlots[0];

      expect(slot.home).toEqual({
        type: 'standing',
        place: 1,
        groupName: 'Gruppe 1',
      });
      expect(slot.away).toEqual({
        type: 'standing',
        place: 2,
        groupName: 'Gruppe 2',
      });
      expect(slot.official).toEqual({
        type: 'standing',
        place: 3,
        groupName: 'Pool A',
      });
    });

    it('parses winner/loser references correctly', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Final',
              standing: 'Final',
              home: 'Gewinner HF1',
              away: 'Gewinner HF2',
              official: 'Verlierer HF1',
            },
          ],
        },
      ];

      const result = importFromJson(json);
      const slot = result.fields[0].gameSlots[0];

      expect(slot.home).toEqual({ type: 'winner', matchName: 'HF1' });
      expect(slot.away).toEqual({ type: 'winner', matchName: 'HF2' });
      expect(slot.official).toEqual({ type: 'loser', matchName: 'HF1' });
    });

    it('parses static references correctly', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Exhibition',
              home: 'Team A',
              away: 'Team B',
              official: 'Team Officials',
            },
          ],
        },
      ];

      const result = importFromJson(json);
      const slot = result.fields[0].gameSlots[0];

      expect(slot.home).toEqual({ type: 'static', name: 'Team A' });
      expect(slot.away).toEqual({ type: 'static', name: 'Team B' });
      expect(slot.official).toEqual({ type: 'static', name: 'Team Officials' });
    });
  });

  describe('break_after handling', () => {
    it('imports break_after when present', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
              break_after: 10,
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].gameSlots[0].breakAfter).toBe(10);
    });

    it('defaults break_after to 0 when not present', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].gameSlots[0].breakAfter).toBe(0);
    });
  });

  describe('field name handling', () => {
    it('handles numeric field names as strings', () => {
      const json: ScheduleJson[] = [
        {
          field: 1,
          games: [],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].name).toBe('1');
    });

    it('handles string field names', () => {
      const json: ScheduleJson[] = [
        {
          field: 'Main Field',
          games: [],
        },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].name).toBe('Main Field');
    });
  });

  describe('state initialization', () => {
    it('generates unique IDs for fields', () => {
      const json: ScheduleJson[] = [
        { field: '1', games: [] },
        { field: '2', games: [] },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].id).toBeTruthy();
      expect(result.fields[1].id).toBeTruthy();
      expect(result.fields[0].id).not.toBe(result.fields[1].id);
    });

    it('generates unique IDs for game slots', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
            {
              stage: 'Preliminary',
              standing: 'Spiel 2',
              home: '0_2',
              away: '0_3',
              official: '0_0',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      const id1 = result.fields[0].gameSlots[0].id;
      const id2 = result.fields[0].gameSlots[1].id;

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('sets correct order for fields', () => {
      const json: ScheduleJson[] = [
        { field: 'A', games: [] },
        { field: 'B', games: [] },
        { field: 'C', games: [] },
      ];

      const result = importFromJson(json);

      expect(result.fields[0].order).toBe(0);
      expect(result.fields[1].order).toBe(1);
      expect(result.fields[2].order).toBe(2);
    });

    it('initializes selectedGameSlot as null', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.selectedGameSlot).toBeNull();
    });

    it('initializes validation result as valid', () => {
      const json: ScheduleJson[] = [
        {
          field: '1',
          games: [
            {
              stage: 'Preliminary',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
      ];

      const result = importFromJson(json);

      expect(result.validationResult.isValid).toBe(true);
      expect(result.validationResult.errors).toEqual([]);
      expect(result.validationResult.warnings).toEqual([]);
    });
  });
});

describe('validateScheduleJson', () => {
  it('returns valid for well-formed JSON', () => {
    const json: ScheduleJson[] = [
      {
        field: '1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: '0_2',
          },
        ],
      },
    ];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid for empty array', () => {
    const result = validateScheduleJson([]);

    expect(result.valid).toBe(true);
  });

  it('returns invalid if not an array', () => {
    const result = validateScheduleJson({ field: '1' } as unknown as ScheduleJson[]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Input must be an array');
  });

  it('returns invalid if field is missing', () => {
    const json = [{ games: [] }] as unknown as ScheduleJson[];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('field'))).toBe(true);
  });

  it('returns invalid if games is missing', () => {
    const json = [{ field: '1' }] as unknown as ScheduleJson[];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('games'))).toBe(true);
  });

  it('returns invalid if games is not an array', () => {
    const json = [{ field: '1', games: {} }] as unknown as ScheduleJson[];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('games'))).toBe(true);
  });

  it('returns invalid if game is missing required properties', () => {
    const json: ScheduleJson[] = [
      {
        field: '1',
        games: [
          {
            stage: 'Preliminary',
            // missing standing, home, away, official
          } as unknown as { stage: string; standing: string; home: string; away: string; official: string },
        ],
      },
    ];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
  });

  it('collects multiple errors', () => {
    const json = [
      { games: [] },
      { field: '1' },
    ] as unknown as ScheduleJson[];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('round-trip import/export', () => {
  it('preserves data through import and export', () => {
    const originalJson: ScheduleJson[] = [
      {
        field: '1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: '0_2',
          },
          {
            stage: 'Final',
            standing: 'P1',
            home: 'Gewinner Spiel 1',
            away: 'P1 Gruppe 1',
            official: 'Verlierer Spiel 1',
          },
        ],
      },
    ];

    const imported = importFromJson(originalJson);
    const exported = exportToJson(imported);

    expect(exported).toEqual(originalJson);
  });

  it('preserves break_after through round-trip', () => {
    const originalJson: ScheduleJson[] = [
      {
        field: '1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: '0_2',
            break_after: 15,
          },
        ],
      },
    ];

    const imported = importFromJson(originalJson);
    const exported = exportToJson(imported);

    expect(exported[0].games[0].break_after).toBe(15);
  });
});

// Helper function to create state with a single game for testing
function createStateWithGame(
  overrides: Partial<GameSlot> & {
    home?: GameSlot['home'];
    away?: GameSlot['away'];
    official?: GameSlot['official'];
    breakAfter?: number;
  }
): DesignerState {
  const slot: GameSlot = {
    id: 'test-slot',
    stage: 'Preliminary',
    standing: 'Test',
    home: overrides.home ?? { type: 'static', name: '' },
    away: overrides.away ?? { type: 'static', name: '' },
    official: overrides.official ?? { type: 'static', name: '' },
    breakAfter: overrides.breakAfter ?? 0,
  };

  const field: Field = {
    id: 'test-field',
    name: 'Test Field',
    order: 0,
    gameSlots: [slot],
  };

  return {
    fields: [field],
    selectedGameSlot: null,
    validationResult: { isValid: true, errors: [], warnings: [] },
  };
}

describe('validateScheduleJson - Additional Coverage', () => {
  it('returns invalid if game property is not a string', () => {
    const json: ScheduleJson[] = [
      {
        field: 'Field 1',
        games: [
          {
            stage: 'Preliminary',
            standing: 123, // Should be string
            home: '0_0',
            away: '0_1',
            official: '0_2',
          } as unknown as { stage: string; standing: string; home: string; away: string; official: string },
        ],
      },
    ];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("'standing' must be a string"))).toBe(true);
  });

  it('returns invalid if break_after is not a number', () => {
    const json: ScheduleJson[] = [
      {
        field: 'Field 1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: '0_2',
            break_after: 'not-a-number', // Should be number
          } as unknown as { stage: string; standing: string; home: string; away: string; official: string; break_after?: number },
        ],
      },
    ];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("'break_after' must be a number"))).toBe(true);
  });

  it('validates game with valid break_after', () => {
    const json: ScheduleJson[] = [
      {
        field: 'Field 1',
        games: [
          {
            stage: 'Preliminary',
            standing: 'Spiel 1',
            home: '0_0',
            away: '0_1',
            official: '0_2',
            break_after: 10,
          },
        ],
      },
    ];

    const result = validateScheduleJson(json);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('generateExportFilename', () => {
  it('generates filename with game and field counts', () => {
    const state: DesignerState = {
      fields: [
        {
          id: 'field-1',
          name: 'Field 1',
          order: 0,
          gameSlots: [
            createGameSlot('Spiel 1'),
            createGameSlot('Spiel 2'),
          ],
        },
        {
          id: 'field-2',
          name: 'Field 2',
          order: 1,
          gameSlots: [
            createGameSlot('Spiel 3'),
          ],
        },
      ],
      selectedGameSlot: null,
      validationResult: { isValid: true, errors: [], warnings: [] },
    };

    const filename = generateExportFilename(state);

    expect(filename).toBe('schedule_3_games_2_fields.json');
  });

  it('generates filename for empty state', () => {
    const state: DesignerState = {
      fields: [],
      selectedGameSlot: null,
      validationResult: { isValid: true, errors: [], warnings: [] },
    };

    const filename = generateExportFilename(state);

    expect(filename).toBe('schedule_0_games_0_fields.json');
  });
});

describe('downloadScheduleJson', () => {
  it('creates and triggers download with default filename', () => {
    const state: DesignerState = {
      fields: [
        {
          id: 'field-1',
          name: 'Field 1',
          order: 0,
          gameSlots: [createGameSlot('Spiel 1')],
        },
      ],
      selectedGameSlot: null,
      validationResult: { isValid: true, errors: [], warnings: [] },
    };

    // Mock DOM methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadScheduleJson(state);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('schedule_1_games_1_fields.json');
    expect(mockLink.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    // Cleanup
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('creates and triggers download with custom filename', () => {
    const state: DesignerState = {
      fields: [
        {
          id: 'field-1',
          name: 'Field 1',
          order: 0,
          gameSlots: [createGameSlot('Spiel 1')],
        },
      ],
      selectedGameSlot: null,
      validationResult: { isValid: true, errors: [], warnings: [] },
    };

    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadScheduleJson(state, 'custom_schedule.json');

    expect(mockLink.download).toBe('custom_schedule.json');
    expect(mockLink.click).toHaveBeenCalled();

    // Cleanup
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});

function createGameSlot(standing: string): GameSlot {
  return {
    id: `slot-${standing}`,
    stage: 'Preliminary',
    standing,
    home: { type: 'static', name: '' },
    away: { type: 'static', name: '' },
    official: { type: 'static', name: '' },
    breakAfter: 0,
  };
}
