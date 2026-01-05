/**
 * Tournament Generator
 *
 * Core logic to generate complete tournament structures from templates.
 * Creates fields, stages, and games based on predefined tournament formats.
 */

import { v4 as uuidv4 } from 'uuid';
import { TournamentTemplate, TournamentGenerationConfig } from '../types/tournament';
import {
  FieldNode,
  StageNode,
  GameNode,
  GameToGameEdge,
  GlobalTeam,
  RoundRobinConfig,
  PlacementConfig,
} from '../types/flowchart';
import { createFieldNode, createStageNode } from '../types/flowchart';
import { generateRoundRobinGames, generatePlacementGames } from './gameGenerators';
import { calculateGameTimes } from './timeCalculation';

/**
 * Complete tournament structure
 */
export interface TournamentStructure {
  fields: FieldNode[];
  stages: StageNode[];
  games: GameNode[];
  edges: GameToGameEdge[];
}

/**
 * Generate complete tournament structure from template and config
 *
 * @param teams - Global team pool
 * @param config - Tournament generation configuration
 * @returns Complete tournament structure with fields, stages, games, and edges
 * @throws Error if team count doesn't match template requirements
 */
export function generateTournament(
  teams: GlobalTeam[],
  config: TournamentGenerationConfig
): TournamentStructure {
  const { template, fieldCount, startTime, gameDuration, breakDuration } = config;

  // Validate team count
  if (teams.length < template.teamCount.min || teams.length > template.teamCount.max) {
    throw new Error(
      `Template requires ${template.teamCount.min}-${template.teamCount.max} teams, but ${teams.length} teams provided`
    );
  }

  // 1. Create fields
  const fields = createFields(fieldCount);

  // 2. Create stages and assign to fields
  let stages = createStages(template, fields, startTime);

  // 3. Generate games for each stage
  let games = generateGamesForStages(stages);

  // 4. Calculate game start times based on template timing configuration
  const finalGameDuration = gameDuration || template.timing.defaultGameDuration;
  const finalBreakDuration = breakDuration || template.timing.defaultBreakBetweenGames;

  games = calculateGameTimes(
    fields,
    stages,
    games,
    finalGameDuration,
    finalBreakDuration
  );

  // Update stage start times to match their first game
  stages = stages.map(stage => {
    const stageGames = games.filter(g => g.parentId === stage.id);
    if (stageGames.length > 0 && stageGames[0].data.startTime) {
      return {
        ...stage,
        data: {
          ...stage.data,
          startTime: stageGames[0].data.startTime
        }
      };
    }
    return stage;
  });

  // 5. Create progression edges (winner/loser flows)
  // MVP: Manual edge creation via UI
  const edges: GameToGameEdge[] = [];

  return { fields, stages, games, edges };
}

/**
 * Create field nodes
 *
 * @param count - Number of fields to create
 * @returns Array of field nodes
 */
function createFields(count: number): FieldNode[] {
  const fieldColors = [
    '#d1ecf1', // Light Blue (default)
    '#fff3cd', // Light Yellow
    '#d4edda', // Light Green
    '#f8d7da', // Light Red/Pink
    '#e2e3e5', // Light Gray
    '#d1d3e2', // Light Purple
  ];

  const fields: FieldNode[] = [];
  for (let i = 0; i < count; i++) {
    const fieldId = `field-${uuidv4()}`;
    const field = createFieldNode(
      fieldId,
      {
        name: `Feld ${i + 1}`,
        order: i,
        color: fieldColors[i % fieldColors.length],
      },
      { x: 50 + i * 400, y: 50 }
    );
    fields.push(field);
  }
  return fields;
}

/**
 * Create stage nodes from template and assign to fields
 *
 * @param template - Tournament template
 * @param fields - Available fields
 * @param startTime - Start time for first game
 * @returns Array of stage nodes
 */
function createStages(
  template: TournamentTemplate,
  fields: FieldNode[],
  startTime: string
): StageNode[] {
  const stages: StageNode[] = [];
  let stageOrderCounter = 0;

  for (const stageTemplate of template.stages) {
    if (stageTemplate.fieldAssignment === 'all') {
      // Create one stage per field (parallel execution)
      for (let i = 0; i < fields.length; i++) {
        const stageId = `stage-${uuidv4()}`;
        const stage = createStageNode(stageId, fields[i].id, {
          name: `${stageTemplate.name}${fields.length > 1 ? ` (Feld ${i + 1})` : ''}`,
          stageType: stageTemplate.stageType,
          order: stageOrderCounter,
          progressionMode: stageTemplate.progressionMode,
          progressionConfig: stageTemplate.config,
          startTime: startTime,
          defaultGameDuration: template.timing.defaultGameDuration,
        });
        stages.push(stage);
      }
      stageOrderCounter++;
    } else if (stageTemplate.fieldAssignment === 'split') {
      // Split groups across fields (Group A → Field 1, Group B → Field 2)
      for (let i = 0; i < fields.length; i++) {
        const stageId = `stage-${uuidv4()}`;
        const groupLabel = String.fromCharCode(65 + i); // A, B, C...
        const stage = createStageNode(stageId, fields[i].id, {
          name: `${stageTemplate.name} ${groupLabel}`,
          stageType: stageTemplate.stageType,
          order: stageOrderCounter,
          progressionMode: stageTemplate.progressionMode,
          progressionConfig: stageTemplate.config,
          startTime: startTime,
          defaultGameDuration: template.timing.defaultGameDuration,
        });
        stages.push(stage);
      }
      stageOrderCounter++;
    } else if (typeof stageTemplate.fieldAssignment === 'number') {
      // Assign to specific field index
      const fieldIndex = stageTemplate.fieldAssignment;
      if (fieldIndex < fields.length) {
        const stageId = `stage-${uuidv4()}`;
        const stage = createStageNode(stageId, fields[fieldIndex].id, {
          name: stageTemplate.name,
          stageType: stageTemplate.stageType,
          order: stageOrderCounter,
          progressionMode: stageTemplate.progressionMode,
          progressionConfig: stageTemplate.config,
          startTime: startTime,
          defaultGameDuration: template.timing.defaultGameDuration,
        });
        stages.push(stage);
      }
      stageOrderCounter++;
    }
  }

  return stages;
}

/**
 * Generate games for all stages based on their progression modes
 *
 * @param stages - Stage nodes
 * @returns Array of game nodes
 */
function generateGamesForStages(
  stages: StageNode[]
): GameNode[] {
  const allGames: GameNode[] = [];

  for (const stage of stages) {
    const stageData = stage.data;
    let games: GameNode[] = [];

    if (stageData.progressionMode === 'round_robin') {
      games = generateRoundRobinGames(
        stage.id,
        stageData.progressionConfig as RoundRobinConfig
      );
    } else if (stageData.progressionMode === 'placement') {
      games = generatePlacementGames(
        stage.id,
        stageData.progressionConfig as PlacementConfig
      );
    }
    // 'manual' mode generates no games automatically

    allGames.push(...games);
  }

  return allGames;
}
