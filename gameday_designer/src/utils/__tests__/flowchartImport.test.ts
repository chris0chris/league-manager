/**
 * Tests for Flowchart Import Utility
 */

import { describe, it, expect } from 'vitest';
import {
  importFromScheduleJson,
  validateScheduleJson,
} from '../flowchartImport';
import { isTeamNode, isGameNode, isTeamToGameEdge, isGameToGameEdge } from '../../types/flowchart';

describe('Flowchart Import Utility', () => {
  describe('importFromScheduleJson', () => {
    it('imports a simple schedule correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Vorrunde',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: 'Officials',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.warnings).toHaveLength(0);

      const { nodes, edges, fields } = result.state!;

      // Should have 1 field
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('Feld 1');

      // Should have 2 team nodes + 1 game node
      expect(nodes.filter(isTeamNode)).toHaveLength(2);
      expect(nodes.filter(isGameNode)).toHaveLength(1);

      // Should have 2 team-to-game edges
      expect(edges.filter(isTeamToGameEdge)).toHaveLength(2);
    });

    it('imports winner/loser references correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Finalrunde',
              standing: 'HF1',
              home: '0_0',
              away: '0_1',
              official: '',
            },
            {
              stage: 'Finalrunde',
              standing: 'HF2',
              home: '0_2',
              away: '0_3',
              official: '',
            },
            {
              stage: 'Finalrunde',
              standing: 'P1',
              home: 'Gewinner HF1',
              away: 'Gewinner HF2',
              official: '',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      const { nodes, edges } = result.state!;

      // Should have 4 team nodes + 3 game nodes
      expect(nodes.filter(isTeamNode)).toHaveLength(4);
      expect(nodes.filter(isGameNode)).toHaveLength(3);

      // Should have game-to-game edges for the final
      const gameToGameEdges = edges.filter(isGameToGameEdge);
      expect(gameToGameEdges).toHaveLength(2);

      // Check that edges have correct sourceHandle
      expect(gameToGameEdges.every((e) => e.sourceHandle === 'winner')).toBe(true);
    });

    it('imports loser references correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Finalrunde',
              standing: 'HF1',
              home: '0_0',
              away: '0_1',
              official: '',
            },
            {
              stage: 'Finalrunde',
              standing: 'HF2',
              home: '0_2',
              away: '0_3',
              official: '',
            },
            {
              stage: 'Finalrunde',
              standing: 'P3',
              home: 'Verlierer HF1',
              away: 'Verlierer HF2',
              official: '',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      const { edges } = result.state!;

      // Check loser edges
      const gameToGameEdges = edges.filter(isGameToGameEdge);
      expect(gameToGameEdges.every((e) => e.sourceHandle === 'loser')).toBe(true);
    });

    it('imports break_after correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Vorrunde',
              standing: 'Spiel 1',
              home: '0_0',
              away: '0_1',
              official: '',
              break_after: 15,
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      const gameNode = result.state!.nodes.find(isGameNode);
      expect(gameNode?.data.breakAfter).toBe(15);
    });

    it('imports standing references correctly', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Finalrunde',
              standing: 'HF1',
              home: 'P1 Gruppe 1',
              away: 'P2 Gruppe 2',
              official: '',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      const teamNodes = result.state!.nodes.filter(isTeamNode);
      expect(teamNodes).toHaveLength(2);

      // Check that references are parsed correctly
      const p1Node = teamNodes.find((n) => n.data.label === 'P1 Gruppe 1');
      expect(p1Node?.data.reference).toEqual({
        type: 'standing',
        place: 1,
        groupName: 'Gruppe 1',
      });
    });

    it('handles multiple fields', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [{ stage: 'Vorrunde', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' }],
        },
        {
          field: 'Feld 2',
          games: [{ stage: 'Vorrunde', standing: 'Spiel 2', home: '0_2', away: '0_3', official: '' }],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);
      expect(result.state!.fields).toHaveLength(2);
      expect(result.state!.fields[0].name).toBe('Feld 1');
      expect(result.state!.fields[1].name).toBe('Feld 2');
    });

    it('reuses team nodes for repeated references', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 'Vorrunde', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' },
            { stage: 'Vorrunde', standing: 'Spiel 2', home: '0_0', away: '0_2', official: '' },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      // Should have only 3 unique team nodes, not 4
      const teamNodes = result.state!.nodes.filter(isTeamNode);
      expect(teamNodes).toHaveLength(3);
    });

    it('fails for invalid input', () => {
      const result = importFromScheduleJson('not an array');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid input: expected an array of field schedules');
    });

    it('adds warnings for unresolved match references', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Finalrunde',
              standing: 'P1',
              home: 'Gewinner HF1', // HF1 doesn't exist
              away: 'Gewinner HF2', // HF2 doesn't exist
              official: '',
            },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('HF1'))).toBe(true);
    });

    it('positions nodes with auto-layout', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 'Vorrunde', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' },
          ],
        },
      ];

      const result = importFromScheduleJson(json);

      expect(result.success).toBe(true);

      // All nodes should have positions
      for (const node of result.state!.nodes) {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      }
    });
  });

  describe('validateScheduleJson', () => {
    it('returns empty array for valid JSON', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 'Vorrunde', standing: 'Spiel 1', home: '0_0', away: '0_1', official: '' },
          ],
        },
      ];

      const errors = validateScheduleJson(json);
      expect(errors).toHaveLength(0);
    });

    it('returns error when input is not an array', () => {
      const errors = validateScheduleJson({ field: 'Feld 1' });
      expect(errors).toContain('Input must be an array');
    });

    it('returns error when field entry is not an object', () => {
      const errors = validateScheduleJson(['not an object']);
      expect(errors).toContain('Field 1: Entry must be an object');
    });

    it('returns error when field property is missing', () => {
      const errors = validateScheduleJson([{ games: [] }]);
      expect(errors).toContain("Field 1: Missing 'field' property");
    });

    it('returns error when games property is missing', () => {
      const errors = validateScheduleJson([{ field: 'Feld 1' }]);
      expect(errors).toContain("Field 1: Missing 'games' property");
    });

    it('returns error when games is not an array', () => {
      const errors = validateScheduleJson([{ field: 'Feld 1', games: 'not an array' }]);
      expect(errors).toContain("Field 1: 'games' must be an array");
    });

    it('returns error when game is missing required properties', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 'Vorrunde' }, // Missing standing, home, away
          ],
        },
      ];

      const errors = validateScheduleJson(json);
      expect(errors.some((e) => e.includes("Missing 'standing'"))).toBe(true);
      expect(errors.some((e) => e.includes("Missing 'home'"))).toBe(true);
      expect(errors.some((e) => e.includes("Missing 'away'"))).toBe(true);
    });

    it('returns error when game property is not a string', () => {
      const json = [
        {
          field: 'Feld 1',
          games: [
            { stage: 123, standing: 'Spiel 1', home: '0_0', away: '0_1' },
          ],
        },
      ];

      const errors = validateScheduleJson(json);
      expect(errors.some((e) => e.includes("'stage' must be a string"))).toBe(true);
    });
  });
});
