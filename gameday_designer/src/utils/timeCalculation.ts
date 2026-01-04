/**
 * Time Calculation Utilities
 *
 * Provides functions for parsing, formatting, and calculating game start times
 * in the Gameday Designer application.
 */

import type { StageNode, GameNode } from '../types/flowchart';

/**
 * Parse a time string (HH:MM) into minutes since midnight.
 *
 * @param timeStr - Time string in HH:MM format (24-hour)
 * @returns Total minutes since midnight (0-1439)
 * @throws Error if time string is invalid
 *
 * @example
 * parseTime("10:30") // returns 630
 * parseTime("00:00") // returns 0
 * parseTime("23:59") // returns 1439
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
 *
 * @example
 * formatTime(630) // returns "10:30"
 * formatTime(0)   // returns "00:00"
 * formatTime(1439) // returns "23:59"
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
 * @param minutesToAdd - Number of minutes to add (can be negative)
 * @returns New time string in HH:MM format
 *
 * @example
 * addMinutes("10:00", 50) // returns "10:50"
 * addMinutes("10:30", 90) // returns "12:00"
 * addMinutes("23:00", 120) // returns "01:00" (wraps to next day)
 */
export function addMinutes(timeStr: string, minutesToAdd: number): string {
  const totalMinutes = parseTime(timeStr) + minutesToAdd;
  return formatTime(totalMinutes);
}

/**
 * Alias for addMinutes to match test naming convention.
 * Add minutes to a time string (HH:MM format).
 *
 * @param time - Time in HH:MM format (24-hour)
 * @param minutes - Minutes to add
 * @returns New time in HH:MM format
 */
export function addMinutesToTime(time: string, minutes: number): string {
  return addMinutes(time, minutes);
}

/**
 * Validate that a string matches HH:MM time format.
 *
 * @param timeStr - String to validate
 * @returns true if valid HH:MM format (24-hour), false otherwise
 *
 * @example
 * isValidTimeFormat("10:30") // returns true
 * isValidTimeFormat("24:00") // returns false (invalid hour)
 * isValidTimeFormat("10:60") // returns false (invalid minute)
 * isValidTimeFormat("1:30")  // returns true (single digit hour allowed)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
}

/**
 * Calculate the start time for a specific game within a stage.
 *
 * Takes into account:
 * - Stage start time as the baseline
 * - Game durations and break times
 * - Manual time overrides (which create new baselines)
 *
 * @param stage - The stage node containing the games
 * @param games - Array of game nodes in order (should be sorted by standing/order)
 * @param gameIndex - Index of the game to calculate time for
 * @returns Calculated start time in HH:MM format, or undefined if stage has no start time
 *
 * @example
 * // Stage starts at 10:00, games are 50 min with 10 min breaks
 * calculateGameStartTime(stage, games, 0) // returns "10:00"
 * calculateGameStartTime(stage, games, 1) // returns "11:00" (10:00 + 50 + 10)
 * calculateGameStartTime(stage, games, 2) // returns "12:00"
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

  // First game starts at stage start time
  if (gameIndex === 0) {
    return stageStartTime;
  }

  const targetGame = games[gameIndex];
  if (!targetGame) {
    return undefined;
  }

  // If this game has a manual override, return it
  if (targetGame.data.manualTime && targetGame.data.startTime) {
    return targetGame.data.startTime;
  }

  // Calculate cumulative time from stage start
  let cumulativeMinutes = 0;
  const defaultDuration = stage.data.defaultGameDuration ?? 50;

  for (let i = 0; i < gameIndex; i++) {
    const game = games[i];

    // If we encounter a manual time, use it as new baseline
    if (game.data.manualTime && game.data.startTime) {
      const manualTimeMinutes = parseTime(game.data.startTime);
      const stageStartMinutes = parseTime(stageStartTime);
      cumulativeMinutes = manualTimeMinutes - stageStartMinutes;
    } else {
      // Add this game's duration and break time
      const gameDuration = game.data.duration ?? defaultDuration;
      const breakAfter = game.data.breakAfter ?? 0;
      cumulativeMinutes += gameDuration + breakAfter;
    }
  }

  return addMinutes(stageStartTime, cumulativeMinutes);
}

/**
 * Recalculate start times for all games in a stage.
 *
 * This function processes all games and returns updated start times,
 * respecting manual overrides and using them as new baselines.
 *
 * @param stage - The stage node containing configuration
 * @param games - Array of game nodes (should be sorted by standing/order)
 * @returns Array of objects with gameId and calculated startTime
 *
 * @example
 * const updates = recalculateStageGameTimes(stage, games);
 * // [
 * //   { gameId: "game1", startTime: "10:00" },
 * //   { gameId: "game2", startTime: "11:00" },
 * //   { gameId: "game3", startTime: "12:00" }
 * // ]
 */
export function recalculateStageGameTimes(
  stage: StageNode,
  games: GameNode[]
): Array<{ gameId: string; startTime: string | undefined }> {
  if (!stage.data.startTime) {
    // No stage start time, clear all auto-calculated times
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
 * Get the end time for a game based on its start time and duration.
 *
 * @param startTime - Game start time in HH:MM format
 * @param duration - Game duration in minutes
 * @returns End time in HH:MM format
 *
 * @example
 * getGameEndTime("10:00", 50) // returns "10:50"
 * getGameEndTime("10:30", 60) // returns "11:30"
 */
export function getGameEndTime(startTime: string, duration: number): string {
  return addMinutes(startTime, duration);
}

/**
 * Calculate the time difference between two time strings in minutes.
 *
 * @param startTime - Starting time in HH:MM format
 * @param endTime - Ending time in HH:MM format
 * @returns Difference in minutes (positive if endTime is later)
 *
 * @example
 * getTimeDifference("10:00", "11:30") // returns 90
 * getTimeDifference("11:30", "10:00") // returns -90
 */
export function getTimeDifference(startTime: string, endTime: string): number {
  return parseTime(endTime) - parseTime(startTime);
}

// ============================================================================
// Tournament-wide time calculation
// ============================================================================

/**
 * Calculate the end time of a stage based on its games.
 *
 * Takes into account game durations and breaks between games.
 * The last game does not have a break after it.
 *
 * @param stage - The stage node
 * @param gamesInStage - Games belonging to this stage
 * @param breakDuration - Break duration between games in minutes
 * @returns End time in HH:MM format
 *
 * @example
 * // Stage starts at 09:00, has 3 games of 50 min with 10 min breaks
 * getStageEndTime(stage, games, 10) // returns "11:50"
 */
export function getStageEndTime(
  stage: StageNode,
  gamesInStage: GameNode[],
  breakDuration: number
): string {
  if (gamesInStage.length === 0) {
    return stage.data.startTime || '09:00';
  }

  const startTime = stage.data.startTime || '09:00';
  const defaultDuration = stage.data.defaultGameDuration || 50;

  let currentTime = startTime;

  for (let i = 0; i < gamesInStage.length; i++) {
    const game = gamesInStage[i];
    const gameDuration = game.data.duration || defaultDuration;

    // Add game duration
    currentTime = addMinutesToTime(currentTime, gameDuration);

    // Add break duration (except after last game)
    if (i < gamesInStage.length - 1) {
      currentTime = addMinutesToTime(currentTime, breakDuration);
    }
  }

  return currentTime;
}

/**
 * Calculate start times for all games in a tournament.
 *
 * Logic:
 * - Games in the same stage on different fields start at the same time (parallel execution)
 * - Games on the same field are staggered with break duration between them
 * - Each stage calculates its start time based on when the previous stage finishes
 * - Stages with the same order number run in parallel
 * - Manually set times (manualTime: true) are preserved
 *
 * @param fields - All field nodes
 * @param stages - All stage nodes (will be sorted by order internally)
 * @param games - All game nodes
 * @param gameDuration - Default game duration in minutes
 * @param breakDuration - Break duration between games in minutes
 * @returns Updated game nodes with calculated startTime
 *
 * @example
 * For a 6-team tournament with 2 fields:
 * - Group Stage (order 0):
 *   - Field 1: Game 1 @ 09:00, Game 2 @ 10:00, Game 3 @ 11:00
 *   - Field 2: Game 4 @ 09:00, Game 5 @ 10:00, Game 6 @ 11:00
 *   - Stage finishes @ 11:50 (last game ends)
 * - Playoffs (order 1) start @ 12:00 (after 10min break)
 */
export function calculateGameTimes(
  fields: import('../types/flowchart').FieldNode[],
  stages: StageNode[],
  games: GameNode[],
  gameDuration: number,
  breakDuration: number
): GameNode[] {
  if (games.length === 0) {
    return [];
  }

  // Sort stages by order to process them sequentially
  const sortedStages = [...stages].sort((a, b) => a.data.order - b.data.order);

  // Group stages by their order (for parallel execution)
  const stagesByOrder = new Map<number, StageNode[]>();
  sortedStages.forEach(stage => {
    const order = stage.data.order;
    if (!stagesByOrder.has(order)) {
      stagesByOrder.set(order, []);
    }
    stagesByOrder.get(order)!.push(stage);
  });

  // Track the end time of the previous order (for calculating next order's start time)
  let previousOrderEndTime: string | null = null;

  // Create a copy of games array to modify
  const updatedGames = [...games];

  // Process each order group
  stagesByOrder.forEach((parallelStages, order) => {
    // Calculate start time for this order
    let orderStartTime: string;

    if (order === 0) {
      // First order - use the first stage's start time or default
      orderStartTime = parallelStages[0]?.data.startTime || '09:00';
    } else {
      // Subsequent orders - start after previous order finishes + break
      if (previousOrderEndTime) {
        orderStartTime = addMinutesToTime(previousOrderEndTime, breakDuration);
      } else {
        orderStartTime = parallelStages[0]?.data.startTime || '09:00';
      }
    }

    // Track the latest end time across all parallel stages
    let latestEndTime = orderStartTime;

    // Process each stage in this order (parallel execution)
    parallelStages.forEach(stage => {
      const stageGames = updatedGames.filter(game => game.parentId === stage.id);

      if (stageGames.length === 0) {
        return;
      }

      let currentTime = orderStartTime;
      const defaultDuration = stage.data.defaultGameDuration || gameDuration;

      // Calculate times for each game in the stage
      for (let i = 0; i < stageGames.length; i++) {
        const game = stageGames[i];
        const gameIndex = updatedGames.findIndex(g => g.id === game.id);

        if (gameIndex === -1) continue;

        // Skip if game has manual time set
        if (game.data.manualTime && game.data.startTime) {
          currentTime = game.data.startTime;
          // Add game duration to currentTime for next game
          const duration = game.data.duration || defaultDuration;
          currentTime = addMinutesToTime(currentTime, duration);
          if (i < stageGames.length - 1) {
            currentTime = addMinutesToTime(currentTime, breakDuration);
          }
          continue;
        }

        // Set start time for this game
        updatedGames[gameIndex] = {
          ...game,
          data: {
            ...game.data,
            startTime: currentTime,
            duration: game.data.duration || defaultDuration,
          },
        };

        // Calculate next game's start time
        const duration = game.data.duration || defaultDuration;
        currentTime = addMinutesToTime(currentTime, duration);

        // Add break duration (except after last game in stage)
        if (i < stageGames.length - 1) {
          currentTime = addMinutesToTime(currentTime, breakDuration);
        }
      }

      // Update latestEndTime if this stage finishes later
      if (currentTime > latestEndTime) {
        latestEndTime = currentTime;
      }
    });

    // Update previousOrderEndTime for next order
    previousOrderEndTime = latestEndTime;
  });

  return updatedGames;
}
