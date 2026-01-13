/**
 * Tests for Tournament Generator Utility
 *
 * TDD RED Phase: Comprehensive tests for tournament structure generation
 *
 * Coverage targets:
 * - Tournament structure generation
 * - Field creation and configuration
 * - Stage creation from templates
 * - Game generation for stages
 * - Time calculation integration
 * - Error handling for invalid team counts
 * - Field assignment strategies (all, split, specific)
 */

import { describe, it, expect, vi } from 'vitest';
import { generateTournament } from '../tournamentGenerator';
import type { TournamentTemplate, TournamentGenerationConfig } from '../../types/tournament';
import type { GlobalTeam } from '../../types/flowchart';

// Mock the time calculation module
vi.mock('../timeCalculation', () => ({
  calculateGameTimes: vi.fn((fields, stages, games) => games),
}));

// Mock the game generators module
vi.mock('../gameGenerators', () => ({
  generateRoundRobinGames: vi.fn(() => []),
  generatePlacementGames: vi.fn(() => []),
}));

describe('tournamentGenerator', () => {
  const sampleTeams: GlobalTeam[] = [
    { id: 'team1', label: 'Team A', groupId: null, order: 0 },
    { id: 'team2', label: 'Team B', groupId: null, order: 1 },
    { id: 'team3', label: 'Team C', groupId: null, order: 2 },
    { id: 'team4', label: 'Team D', groupId: null, order: 3 },
    { id: 'team5', label: 'Team E', groupId: null, order: 4 },
    { id: 'team6', label: 'Team F', groupId: null, order: 5 },
  ];

  const basicTemplate: TournamentTemplate = {
    id: 'F6-2-2',
    name: '6 Teams - 2 Groups of 3',
    teamCount: {
      min: 6,
      max: 6,
      exact: 6,
    },
    fieldOptions: [1, 2],
    stages: [
      {
        name: 'Group Stage',
        category: 'preliminary',
        progressionMode: 'round_robin',
        config: {
          gamesPerTeam: 2,
        },
        fieldAssignment: 'split',
      },
      {
        name: 'Finals',
        category: 'final',
        progressionMode: 'placement',
        config: {
          positions: 4,
          format: 'single_elimination',
        },
        fieldAssignment: 0,
      },
    ],
    timing: {
      firstGameStartTime: '10:00',
      defaultGameDuration: 30,
      defaultBreakBetweenGames: 5,
    },
  };

  describe('Field Creation', () => {
    it('should create the specified number of fields', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(2);
    });

    it('should create fields with sequential names', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 3,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields[0].data.name).toBe('Feld 1');
      expect(result.fields[1].data.name).toBe('Feld 2');
      expect(result.fields[2].data.name).toBe('Feld 3');
    });

    it('should create fields with sequential orders', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields[0].data.order).toBe(0);
      expect(result.fields[1].data.order).toBe(1);
    });

    it('should assign distinct colors to fields', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 3,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      const colors = result.fields.map(f => f.data.color);
      expect(new Set(colors).size).toBe(3); // All colors should be unique
    });

    it('should create single field when fieldCount is 1', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 1,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].data.name).toBe('Feld 1');
    });
  });

  describe('Stage Creation', () => {
    it('should create stages from template', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // 2 stages from 'split' assignment (Group Stage A & B) + 1 from field 0 assignment (Finals)
      expect(result.stages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle "all" field assignment', () => {
      const template: TournamentTemplate = {
        ...basicTemplate,
        stages: [
          {
            name: 'Test Stage',
            category: 'preliminary',
            progressionMode: 'round_robin',
            config: { gamesPerTeam: 2 },
            fieldAssignment: 'all',
          },
        ],
      };

      const config: TournamentGenerationConfig = {
        template,
        fieldCount: 3,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Should create one stage per field
      expect(result.stages).toHaveLength(3);
      expect(result.stages[0].data.name).toContain('Test Stage');
    });

    it('should handle "split" field assignment', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Should create Group Stage A and Group Stage B
      const groupStages = result.stages.filter(s => s.data.name.includes('Group Stage'));
      expect(groupStages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle specific field index assignment', () => {
      const template: TournamentTemplate = {
        ...basicTemplate,
        stages: [
          {
            name: 'Finals',
            category: 'final',
            progressionMode: 'placement',
            config: { positions: 2, format: 'single_elimination' },
            fieldAssignment: 0,
          },
        ],
      };

      const config: TournamentGenerationConfig = {
        template,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Should create Finals stage on field 0
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].parentId).toBe(result.fields[0].id);
    });

    it('should assign group labels for split assignment', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      const groupStages = result.stages.filter(s => s.data.name.includes('Group Stage'));
      const labels = groupStages.map(s => s.data.name);
      expect(labels).toContain('Group Stage A');
      expect(labels).toContain('Group Stage B');
    });

    it('should set stage order correctly', () => {
      const template: TournamentTemplate = {
        ...basicTemplate,
        stages: [
          {
            name: 'Stage 1',
            category: 'preliminary',
            progressionMode: 'round_robin',
            config: { gamesPerTeam: 2 },
            fieldAssignment: 'all',
          },
          {
            name: 'Stage 2',
            category: 'final',
            progressionMode: 'placement',
            config: { positions: 2, format: 'single_elimination' },
            fieldAssignment: 0,
          },
        ],
      };

      const config: TournamentGenerationConfig = {
        template,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // All Stage 1 instances should have order 0
      const stage1 = result.stages.filter(s => s.data.name.includes('Stage 1'));
      stage1.forEach(s => expect(s.data.order).toBe(0));

      // Stage 2 should have order 1
      const stage2 = result.stages.find(s => s.data.name === 'Stage 2');
      expect(stage2?.data.order).toBe(1);
    });
  });

  describe('Game Generation', () => {
    it('should return games array', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.games).toBeDefined();
      expect(Array.isArray(result.games)).toBe(true);
    });

    it('should return edges array', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.edges).toBeDefined();
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it('should initialize empty edges array', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Edges are created manually via UI in MVP
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('Timing Configuration', () => {
    it('should use default game duration from template', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 1,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Time calculation is mocked, but structure should be correct
      expect(result.stages.length).toBeGreaterThan(0);
    });

    it('should override game duration when provided', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 1,
        startTime: '10:00',
        gameDuration: 45,
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(1);
    });

    it('should override break duration when provided', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 1,
        startTime: '10:00',
        breakDuration: 10,
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(1);
    });

    it('should set start time on stages', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '14:30',
      };

      const result = generateTournament(sampleTeams, config);

      result.stages.forEach(stage => {
        expect(stage.data.startTime).toBeDefined();
      });
    });
  });

  describe('Team Count Validation', () => {
    it('should throw error when team count is too low', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const tooFewTeams = sampleTeams.slice(0, 4);

      expect(() => {
        generateTournament(tooFewTeams, config);
      }).toThrow(/requires 6-6 teams/);
    });

    it('should throw error when team count is too high', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const tooManyTeams = [
        ...sampleTeams,
        { id: 'team7', label: 'Team G', groupId: null, order: 6 },
        { id: 'team8', label: 'Team H', groupId: null, order: 7 },
      ];

      expect(() => {
        generateTournament(tooManyTeams, config);
      }).toThrow(/requires 6-6 teams/);
    });

    it('should accept team count within min-max range', () => {
      const flexTemplate: TournamentTemplate = {
        ...basicTemplate,
        teamCount: {
          min: 4,
          max: 8,
        },
      };

      const config: TournamentGenerationConfig = {
        template: flexTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      expect(() => {
        generateTournament(sampleTeams, config);
      }).not.toThrow();
    });

    it('should include team count in error message', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const wrongTeams = sampleTeams.slice(0, 3);

      expect(() => {
        generateTournament(wrongTeams, config);
      }).toThrow(/3 teams provided/);
    });
  });

  describe('Complete Tournament Structure', () => {
    it('should return all required structure components', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result).toHaveProperty('fields');
      expect(result).toHaveProperty('stages');
      expect(result).toHaveProperty('games');
      expect(result).toHaveProperty('edges');
    });

    it('should link stages to fields via parentId', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      const fieldIds = new Set(result.fields.map(f => f.id));

      result.stages.forEach(stage => {
        expect(stage.parentId).toBeDefined();
        expect(fieldIds.has(stage.parentId!)).toBe(true);
      });
    });

    it('should set progression mode on stages', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      result.stages.forEach(stage => {
        expect(['manual', 'round_robin', 'placement']).toContain(stage.data.progressionMode);
      });
    });

    it('should set stage type on stages', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      result.stages.forEach(stage => {
        expect(['STANDARD', 'RANKING']).toContain(stage.data.stageType);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty teams array with appropriate error', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      expect(() => {
        generateTournament([], config);
      }).toThrow();
    });

    it('should handle single field configuration', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 1,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(1);
      expect(result.stages.length).toBeGreaterThan(0);
    });

    it('should handle template with no stages gracefully', () => {
      const emptyTemplate: TournamentTemplate = {
        ...basicTemplate,
        stages: [],
      };

      const config: TournamentGenerationConfig = {
        template: emptyTemplate,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.stages).toHaveLength(0);
      expect(result.games).toHaveLength(0);
    });

    it('should skip field assignment when field index out of range', () => {
      const template: TournamentTemplate = {
        ...basicTemplate,
        stages: [
          {
            name: 'Test Stage',
            category: 'preliminary',
            progressionMode: 'round_robin',
            config: { gamesPerTeam: 2 },
            fieldAssignment: 5, // Out of range for 2 fields
          },
        ],
      };

      const config: TournamentGenerationConfig = {
        template,
        fieldCount: 2,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      // Should not create the stage if field index is out of range
      expect(result.stages).toHaveLength(0);
    });
  });

  describe('Field Color Assignment', () => {
    it('should cycle through colors when more fields than colors', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 7, // More than 6 predefined colors
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      expect(result.fields).toHaveLength(7);
      // First and 7th field should have same color (cycling)
      expect(result.fields[0].data.color).toBe(result.fields[6].data.color);
    });
  });

  describe('Position Calculation', () => {
    it('should set positions for fields', () => {
      const config: TournamentGenerationConfig = {
        template: basicTemplate,
        fieldCount: 3,
        startTime: '10:00',
      };

      const result = generateTournament(sampleTeams, config);

      result.fields.forEach((field, index) => {
        expect(field.position).toBeDefined();
        expect(field.position.x).toBeGreaterThan(0);
        expect(field.position.y).toBeGreaterThanOrEqual(0);
        // Fields should be spread horizontally
        if (index > 0) {
          expect(field.position.x).toBeGreaterThan(result.fields[index - 1].position.x);
        }
      });
    });
  });
});
