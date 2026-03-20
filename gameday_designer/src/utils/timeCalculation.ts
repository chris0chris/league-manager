/**
 * Time Calculation Utilities
 *
 * Provides functions for parsing, formatting, and calculating game start times
 * in the Gameday Designer application.
 */

import type { StageNode, GameNode, FieldNode } from '../types/flowchart';
import { DEFAULT_START_TIME, DEFAULT_GAME_DURATION } from './tournamentConstants';

/**
 * Parse a time string (HH:MM) into minutes since midnight.
 *
 * @param timeStr - Time string in HH:MM format (24-hour)
 * @returns Total minutes since midnight (0-1439)
 */
export function parseTime(timeStr: string): number {
  if (!isValidTimeFormat(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM or HH:MM:SS`);
  }

  const parts = timeStr.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  return hours * 60 + minutes;
}

/**
 * Format minutes into HH:MM string. 
 * Correctly handles wrap-around for display.
 *
 * @param minutes - Total minutes
 * @returns Time string in HH:MM format (24-hour)
 */
export function formatTime(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Add minutes to a time string and return the result.
 */
export function addMinutes(timeStr: string, minutesToAdd: number): string {
  const totalMinutes = parseTime(timeStr) + minutesToAdd;
  return formatTime(totalMinutes);
}

/**
 * Alias for addMinutes.
 */
export function addMinutesToTime(time: string, minutes: number): string {
  return addMinutes(time, minutes);
}

/**
 * Validate that a string matches HH:MM time format.
 *
 * @param timeStr - String to validate
 * @returns true if valid HH:MM format (24-hour)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
  return timeRegex.test(timeStr);
}

/**
 * Calculate the start time for a specific game within a stage.
 */
export function calculateGameStartTime(
  stage: StageNode,
  games: GameNode[],
  gameIndex: number
): string | undefined {
  const stageStartTime = stage.data.startTime;
  if (!stageStartTime) {
    return undefined;
  }

  const targetGame = games[gameIndex];
  if (!targetGame) {
    return undefined;
  }

  if (targetGame.data.manualTime && targetGame.data.startTime) {
    return targetGame.data.startTime;
  }

  let currentTime = stageStartTime;
  const defaultDuration = stage.data.defaultGameDuration ?? DEFAULT_GAME_DURATION;

  for (let i = 0; i < gameIndex; i++) {
    const game = games[i];

    if (game.data.manualTime && game.data.startTime) {
      currentTime = game.data.startTime;
    }
    
    const gameDuration = game.data.duration ?? defaultDuration;
    const breakAfter = game.data.breakAfter ?? 0;
    currentTime = addMinutes(currentTime, gameDuration + breakAfter);
  }

  return currentTime;
}

/**
 * Recalculate start times for all games in a stage.
 */
export function recalculateStageGameTimes(
  stage: StageNode,
  games: GameNode[]
): Array<{ gameId: string; startTime: string | undefined }> {
  if (!stage.data.startTime) {
    return games.map((game) => ({
      gameId: game.id,
      startTime: game.data.manualTime ? game.data.startTime : undefined,
    }));
  }

  return games.map((game, index) => ({
    gameId: game.id,
    startTime: calculateGameStartTime(stage, games, index),
  }));
}

/**
 * Get the end time for a game.
 */
export function getGameEndTime(startTime: string, duration: number): string {
  return addMinutes(startTime, duration);
}

/**
 * Calculate the time difference between two time strings in minutes.
 */
export function getTimeDifference(startTime: string, endTime: string): number {
  return parseTime(endTime) - parseTime(startTime);
}

/**
 * Calculate the end time of a stage based on its games.
 */
export function getStageEndTime(
  stage: StageNode,
  gamesInStage: GameNode[],
  breakDuration: number
): string {
  if (gamesInStage.length === 0) {
    return stage.data.startTime || DEFAULT_START_TIME;
  }

  const startTime = stage.data.startTime || DEFAULT_START_TIME;
  const defaultDuration = stage.data.defaultGameDuration || DEFAULT_GAME_DURATION;

  let currentTime = startTime;

  for (let i = 0; i < gamesInStage.length; i++) {
    const game = gamesInStage[i];
    const gameDuration = game.data.duration || defaultDuration;

    currentTime = addMinutesToTime(currentTime, gameDuration);

    if (i < gamesInStage.length - 1) {
      currentTime = addMinutesToTime(currentTime, breakDuration);
    }
  }

  return currentTime;
}

/**
 * Calculate start times for all games in a tournament.
 * Uses linear minute counter to prevent wrap-around bugs during calculation.
 */
export function calculateGameTimes(
  fields: FieldNode[],
  stages: StageNode[],
  games: GameNode[],
  gameDuration: number,
  breakDuration: number
): GameNode[] {
  if (games.length === 0) {
    return [];
  }

  // 1. Sort stages by their template-defined order
  const sortedStages = [...stages].sort((a, b) => a.data.order - b.data.order);

  // 2. Track field availability in absolute minutes since tournament start
  // Use a map: fieldId -> absolute minutes (can exceed 1440)
  const fieldBusyUntilMinutes = new Map<string, number>(); 

  // 3. Base tournament start time in absolute minutes
  const baseStartTimeMinutes = parseTime(stages.find(s => s.data.order === 0)?.data.startTime || DEFAULT_START_TIME);

  // Use a map for internal updates
  const gameMap = new Map<string, GameNode>(games.map(g => [g.id, g]));
  // Track absolute end minutes for every game to enforce synchronization barriers
  const gameEndAbsMinutes = new Map<string, number>();

  // 4. Process stages one by one in chronological order
  for (const stage of sortedStages) {
    const fieldId = stage.parentId;
    if (!fieldId) continue;

    const order = stage.data.order;

    // Determine synchronization barrier (must start after ALL games in previous orders complete)
    let globalBarrierAbsMinutes = baseStartTimeMinutes;
    if (order > 0) {
      const allPreviousGames = Array.from(gameMap.values()).filter(g => {
        const s = stages.find(st => st.id === g.parentId);
        return s && s.data.order < order;
      });
      
      const previousEndTimes = allPreviousGames.map(g => gameEndAbsMinutes.get(g.id) || baseStartTimeMinutes);
      if (previousEndTimes.length > 0) {
        globalBarrierAbsMinutes = Math.max(...previousEndTimes);
      }
    }

    // Determine earliest this stage can start
    let stageEarliestStartAbsMinutes = baseStartTimeMinutes;
    
    // Constraint A: Global barrier
    if (order > 0) {
      stageEarliestStartAbsMinutes = globalBarrierAbsMinutes + breakDuration;
    }

    // Constraint B: Field availability
    if (fieldBusyUntilMinutes.has(fieldId)) {
      const fieldReadyAt = fieldBusyUntilMinutes.get(fieldId)! + breakDuration;
      if (fieldReadyAt > stageEarliestStartAbsMinutes) {
        stageEarliestStartAbsMinutes = fieldReadyAt;
      }
    }

    // Constraint C: Explicit stage start time (wrapped into absolute minutes)
    if (stage.data.startTime) {
      const explicitStartMinutes = parseTime(stage.data.startTime);
      // NOTE: We assume explicit start time refers to the current logical 'day' of the stage
      // or at least shouldn't jump backwards. 
      if (explicitStartMinutes > stageEarliestStartAbsMinutes) {
        stageEarliestStartAbsMinutes = explicitStartMinutes;
      }
    }

    // 5. Calculate times for all games in THIS stage
    const stageGames = Array.from(gameMap.values())
      .filter(game => game.parentId === stage.id)
      .sort((a, b) => {
        // Advanced sort for tournament games
        const standingA = a.data.standing.toLowerCase();
        const standingB = b.data.standing.toLowerCase();
        
        // Priority for specific labels
        const getPriority = (s: string) => {
          if (s.includes('final')) return 100;
          if (s.includes('3rd place') || s.includes('3. platz')) return 90;
          if (s.includes('5th place') || s.includes('5. platz')) return 80;
          if (s.includes('7th place') || s.includes('7. platz')) return 70;
          if (s.includes('sf')) return 50;
          if (s.includes('qf')) return 40;
          return 0;
        };

        const pA = getPriority(standingA);
        const pB = getPriority(standingB);

        if (pA !== pB) return pA - pB;

        // If same priority, use numeric suffix
        const nA = parseInt(standingA.replace(/\D/g, '')) || 0;
        const nB = parseInt(standingB.replace(/\D/g, '')) || 0;
        if (nA !== nB) return nA - nB;

        // Fallback to alphabetical
        return standingA.localeCompare(standingB);
      });

    let currentAbsMinutes = stageEarliestStartAbsMinutes;
    const defaultDuration = stage.data.defaultGameDuration || gameDuration;

    for (let i = 0; i < stageGames.length; i++) {
      const game = stageGames[i];
      
      let gameStartAbsMinutes = currentAbsMinutes;
      if (game.data.manualTime && game.data.startTime) {
        // If manual time, try to find the absolute minutes that match it
        // This is tricky with wrap-around, but we'll assume it's same day for now
        gameStartAbsMinutes = parseTime(game.data.startTime);
      }

      const duration = game.data.duration || defaultDuration;
      const gameEndAbs = gameStartAbsMinutes + duration;

      const updatedGame = {
        ...game,
        data: {
          ...game.data,
          startTime: formatTime(gameStartAbsMinutes),
          duration: duration,
        },
      };
      
      gameMap.set(game.id, updatedGame);
      gameEndAbsMinutes.set(game.id, gameEndAbs);

      // Update field availability
      if (gameEndAbs > (fieldBusyUntilMinutes.get(fieldId) || 0)) {
        fieldBusyUntilMinutes.set(fieldId, gameEndAbs);
      }

      // Advance for next game in stage
      currentAbsMinutes = gameEndAbs + breakDuration;
    }
  }

  return Array.from(gameMap.values());
}