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
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
  }

  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight into HH:MM string.
 *
 * @param minutes - Total minutes since midnight
 * @returns Time string in HH:MM format (24-hour)
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Add minutes to a time string and return the result.
 *
 * @param timeStr - Starting time in HH:MM format
 * @param minutesToAdd - Number of minutes to add
 * @returns New time string in HH:MM format
 */
export function addMinutes(timeStr: string, minutesToAdd: number): string {
  const totalMinutes = parseTime(timeStr) + minutesToAdd;
  return formatTime(totalMinutes);
}

/**
 * Alias for addMinutes to match test naming convention.
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
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
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

  const sortedStages = [...stages].sort((a, b) => a.data.order - b.data.order);
  const stagesByOrder = new Map<number, StageNode[]>();
  sortedStages.forEach(stage => {
    const order = stage.data.order;
    if (!stagesByOrder.has(order)) {
      stagesByOrder.set(order, []);
    }
    stagesByOrder.get(order)!.push(stage);
  });

  let previousOrderEndTime: string | null = null;
  const updatedGames = [...games];

  Array.from(stagesByOrder.keys()).sort((a, b) => a - b).forEach((order) => {
    const parallelStages = stagesByOrder.get(order)!;
    let orderStartTime: string;

    if (order === 0) {
      orderStartTime = parallelStages[0]?.data.startTime || DEFAULT_START_TIME;
    } else {
      if (previousOrderEndTime) {
        orderStartTime = addMinutesToTime(previousOrderEndTime, breakDuration);
      } else {
        orderStartTime = parallelStages[0]?.data.startTime || DEFAULT_START_TIME;
      }
    }

    let latestEndTime = orderStartTime;

    parallelStages.forEach(stage => {
      const stageGames = updatedGames
        .filter(game => game.parentId === stage.id)
        .sort((a, b) => (parseInt(a.data.standing) || 0) - (parseInt(b.data.standing) || 0));

      if (stageGames.length === 0) {
        return;
      }

      let currentTime = stage.data.startTime || orderStartTime;
      const defaultDuration = stage.data.defaultGameDuration || gameDuration;

      for (let i = 0; i < stageGames.length; i++) {
        const game = stageGames[i];
        const gameIndex = updatedGames.findIndex(g => g.id === game.id);

        if (gameIndex === -1) continue;

        if (game.data.manualTime && game.data.startTime) {
          currentTime = game.data.startTime;
        } else {
          updatedGames[gameIndex] = {
            ...game,
            data: {
              ...game.data,
              startTime: currentTime,
              duration: game.data.duration || defaultDuration,
            },
          };
        }

        const duration = updatedGames[gameIndex].data.duration || defaultDuration;
        currentTime = addMinutesToTime(currentTime, duration);
        if (i < stageGames.length - 1) {
          currentTime = addMinutesToTime(currentTime, breakDuration);
        }
      }

      if (parseTime(currentTime) > parseTime(latestEndTime)) {
        latestEndTime = currentTime;
      }
    });

    previousOrderEndTime = latestEndTime;
  });

  return updatedGames;
}
