/**
 * Scroll Helpers
 *
 * Utilities for scrolling to games and expanding collapsed containers.
 * Used for stage progression visualization.
 */

import type { FlowNode } from '../types/flowchart';
import { getGamePath } from './edgeAnalysis';

/**
 * Scroll to an element by ID with smooth animation.
 *
 * @param prefix - Prefix for the ID (e.g. 'game', 'stage', 'field')
 * @param id - ID of the element to scroll to
 * @param smooth - Whether to use smooth scrolling (default: true)
 */
export function scrollToElement(prefix: string, id: string, smooth: boolean = true): void {
  const elementId = id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`;
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Cannot scroll to ${elementId}: element not found`);
    return;
  }

  element.scrollIntoView({
    behavior: smooth ? 'smooth' : 'auto',
    block: 'center',
    inline: 'nearest',
  });
}

/**
 * Scroll to a game row with smooth animation.
 *
 * The game row must have an ID attribute in the format `game-{gameId}`.
 *
 * @param gameId - ID of the game to scroll to
 * @param smooth - Whether to use smooth scrolling (default: true)
 */
export function scrollToGame(gameId: string, smooth: boolean = true): void {
  scrollToElement('game', gameId, smooth);
}

/**
 * Expand collapsed containers to reveal a node (game, stage, or field).
 *
 * @param nodeId - ID of the node to reveal
 * @param type - Type of the node
 * @param nodes - All nodes in the flowchart
 * @param expandField - Callback to expand a field by ID
 * @param expandStage - Callback to expand a stage by ID
 * @returns True if containers were expanded
 */
export function expandPathToNode(
  nodeId: string,
  type: 'game' | 'stage' | 'field' | 'team',
  nodes: FlowNode[],
  expandField: (fieldId: string) => void,
  expandStage: (stageId: string) => void
): boolean {
  if (type === 'game') {
    return expandPathToGame(nodeId, nodes, expandField, expandStage);
  }

  if (type === 'stage') {
    const stageNode = nodes.find(n => n.id === nodeId && n.type === 'stage');
    if (stageNode?.parentId) {
      expandField(stageNode.parentId);
      return true;
    }
  }

  if (type === 'field') {
    // Field is top-level, nothing to expand
    return true;
  }

  // Teams are currently not nested in expandable containers in the pool
  return true;
}

/**
 * Scroll to any element with automatic expansion and waiting.
 */
export async function scrollToElementWithExpansion(
  id: string,
  type: 'game' | 'stage' | 'field' | 'team',
  nodes: FlowNode[],
  expandField: (fieldId: string) => void,
  expandStage: (stageId: string) => void,
  smooth: boolean = true
): Promise<void> {
  // Expand containers
  expandPathToNode(id, type, nodes, expandField, expandStage);

  const prefixMap = {
    game: 'game',
    stage: 'stage',
    field: 'field',
    team: 'team'
  };
  const prefix = prefixMap[type];

  // Wait for element to appear after expansion
  await waitForElement(`${prefix}-${id}`, 1000);

  // Scroll to element
  scrollToElement(prefix, id, smooth);
}

/**
 * Expand collapsed containers to reveal a game.
 *
 * Automatically expands the field and stage that contain the game,
 * ensuring it's visible before scrolling to it.
 *
 * @param gameId - ID of the game to reveal
 * @param nodes - All nodes in the flowchart
 * @param expandField - Callback to expand a field by ID
 * @param expandStage - Callback to expand a stage by ID
 * @returns True if the game path was found and containers expanded
 */
export function expandPathToGame(
  gameId: string,
  nodes: FlowNode[],
  expandField: (fieldId: string) => void,
  expandStage: (stageId: string) => void
): boolean {
  const path = getGamePath(gameId, nodes);
  if (!path) {
    console.warn(`Cannot expand path to game ${gameId}: path not found`);
    return false;
  }

  // Expand field and stage
  expandField(path.field.id);
  expandStage(path.stage.id);

  return true;
}

/**
 * Check if an element is currently visible in the viewport.
 *
 * @param elementId - ID of the element to check
 * @returns True if the element is at least partially visible
 */
export function isElementVisible(elementId: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

  return vertInView && horInView;
}

/**
 * Wait for an element to appear in the DOM.
 *
 * Useful when expanding containers - the element may not be in the DOM
 * immediately due to React rendering.
 *
 * @param elementId - ID of the element to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @param checkInterval - How often to check in milliseconds (default: 50)
 * @returns Promise that resolves when element is found or timeout is reached
 */
export function waitForElement(
  elementId: string,
  timeout: number = 1000,
  checkInterval: number = 50
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const element = document.getElementById(elementId);

      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        console.warn(`Element ${elementId} not found after ${timeout}ms`);
        resolve(null);
        return;
      }

      setTimeout(check, checkInterval);
    };

    check();
  });
}

/**
 * Scroll to a game with automatic expansion and waiting.
 *
 * Combines expandPathToGame, waitForElement, and scrollToGame
 * into a single convenient function.
 *
 * @param gameId - ID of the game to scroll to
 * @param nodes - All nodes in the flowchart
 * @param expandField - Callback to expand a field by ID
 * @param expandStage - Callback to expand a stage by ID
 * @param smooth - Whether to use smooth scrolling (default: true)
 * @returns Promise that resolves when scrolling is complete
 */
export async function scrollToGameWithExpansion(
  gameId: string,
  nodes: FlowNode[],
  expandField: (fieldId: string) => void,
  expandStage: (stageId: string) => void,
  smooth: boolean = true
): Promise<void> {
  // Expand containers
  const expanded = expandPathToGame(gameId, nodes, expandField, expandStage);
  if (!expanded) {
    console.warn(`Cannot scroll to game ${gameId}: path not found`);
    return;
  }

  // Wait for element to appear after expansion
  await waitForElement(`game-${gameId}`, 1000);

  // Scroll to element
  scrollToGame(gameId, smooth);
}