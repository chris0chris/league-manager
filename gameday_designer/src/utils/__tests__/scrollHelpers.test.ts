import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  scrollToGame,
  expandPathToGame,
  isElementVisible,
  waitForElement,
  scrollToGameWithExpansion,
  expandPathToNode,
  scrollToElementWithExpansion,
} from '../scrollHelpers';
import type {
  FlowNode,
  FieldNode,
  StageNode,
  GameNode,
} from '../../types/flowchart';

/**
 * Test suite for scroll helper utilities.
 *
 * Tests functions for scrolling to games and expanding collapsed containers.
 */

describe('scrollHelpers', () => {
  // Test data setup
  const createField = (id: string, name: string, order: number): FieldNode => ({
    id,
    type: 'field',
    data: {
      name,
      order,
      description: '',
    },
    position: { x: 0, y: 0 },
  });

  const createStage = (
    id: string,
    name: string,
    order: number,
    parentId: string
  ): StageNode => ({
    id,
    type: 'stage',
    data: {
      name,
      order,
      stageType: 'vorrunde',
      description: '',
    },
    position: { x: 0, y: 0 },
    parentId,
  });

  const createGame = (
    id: string,
    standing: string,
    parentId: string
  ): GameNode => ({
    id,
    type: 'game',
    data: {
      standing,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamDynamic: null,
      awayTeamDynamic: null,
      official: null,
      breakAfter: 0,
    },
    position: { x: 0, y: 0 },
    parentId,
  });

  // Mock scrollIntoView
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('scrollToGame', () => {
    it('calls scrollIntoView with smooth behavior when element exists', () => {
      // Create a test element
      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);

      scrollToGame('game1', true);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('calls scrollIntoView with auto behavior when smooth is false', () => {
      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);

      scrollToGame('game1', false);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('does nothing when element does not exist', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      scrollToGame('nonexistent-game', true);

      expect(scrollIntoViewMock).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot scroll to game-nonexistent-game: element not found'
      );
    });

    it('uses smooth scrolling by default', () => {
      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);

      scrollToGame('game1');

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  describe('expandPathToNode', () => {
    it('expands path to game', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToNode('game1', 'game', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).toHaveBeenCalledWith('stage1');
    });

    it('expands path to stage', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const nodes: FlowNode[] = [field, stage];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToNode('stage1', 'stage', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).not.toHaveBeenCalled();
    });

    it('handles field type (nothing to expand)', () => {
      const field = createField('field1', 'Feld 1', 0);
      const nodes: FlowNode[] = [field];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToNode('field1', 'field', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).not.toHaveBeenCalled();
    });

    it('handles team type (nothing to expand)', () => {
      const nodes: FlowNode[] = [];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToNode('team1', 'team', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).not.toHaveBeenCalled();
    });
  });

  describe('scrollToElementWithExpansion', () => {
    it('scrolls to stage with expansion', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const nodes: FlowNode[] = [field, stage];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const promise = scrollToElementWithExpansion('stage1', 'stage', nodes, expandField, expandStage);
      
      const element = document.createElement('div');
      element.id = 'stage-stage1';
      document.body.appendChild(element);
      
      vi.runAllTimers();
      await promise;

      expect(expandField).toHaveBeenCalledWith('field1');
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('scrolls to field', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const nodes: FlowNode[] = [field];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const promise = scrollToElementWithExpansion('field1', 'field', nodes, expandField, expandStage);
      
      const element = document.createElement('div');
      element.id = 'field-field1';
      document.body.appendChild(element);
      
      vi.runAllTimers();
      await promise;

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('scrolls to team', async () => {
      const nodes: FlowNode[] = [];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const promise = scrollToElementWithExpansion('team1', 'team', nodes, expandField, expandStage);
      
      const element = document.createElement('div');
      element.id = 'team-team1';
      document.body.appendChild(element);
      
      vi.runAllTimers();
      await promise;

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe('expandPathToGame', () => {
    it('returns false when game path is not found', () => {
      const nodes: FlowNode[] = [];
      const expandField = vi.fn();
      const expandStage = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = expandPathToGame('game1', nodes, expandField, expandStage);

      expect(result).toBe(false);
      expect(expandField).not.toHaveBeenCalled();
      expect(expandStage).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot expand path to game game1: path not found'
      );
    });

    it('calls expandField and expandStage with correct IDs', () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToGame('game1', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).toHaveBeenCalledWith('stage1');
    });

    it('expands path for game in nested hierarchy', () => {
      const field = createField('field2', 'Feld 2', 1);
      const stage = createStage('stage3', 'Finalrunde', 2, 'field2');
      const game = createGame('game5', 'Final', 'stage3');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const result = expandPathToGame('game5', nodes, expandField, expandStage);

      expect(result).toBe(true);
      expect(expandField).toHaveBeenCalledWith('field2');
      expect(expandStage).toHaveBeenCalledWith('stage3');
    });

    it('handles multiple games and expands the correct path', () => {
      const field1 = createField('field1', 'Feld 1', 0);
      const field2 = createField('field2', 'Feld 2', 1);
      const stage1 = createStage('stage1', 'Vorrunde', 0, 'field1');
      const stage2 = createStage('stage2', 'Finalrunde', 1, 'field2');
      const game1 = createGame('game1', 'Match 1', 'stage1');
      const game2 = createGame('game2', 'Final', 'stage2');
      const nodes: FlowNode[] = [field1, field2, stage1, stage2, game1, game2];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      expandPathToGame('game2', nodes, expandField, expandStage);

      expect(expandField).toHaveBeenCalledWith('field2');
      expect(expandStage).toHaveBeenCalledWith('stage2');
      expect(expandField).not.toHaveBeenCalledWith('field1');
      expect(expandStage).not.toHaveBeenCalledWith('stage1');
    });
  });

  describe('isElementVisible', () => {
    it('returns false when element does not exist', () => {
      const result = isElementVisible('nonexistent-element');

      expect(result).toBe(false);
    });

    it('returns true when element is visible in viewport', () => {
      const element = document.createElement('div');
      element.id = 'visible-element';
      document.body.appendChild(element);

      // Mock getBoundingClientRect to return values within viewport
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: 100,
        bottom: 200,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      const result = isElementVisible('visible-element');

      expect(result).toBe(true);
    });

    it('returns false when element is above viewport', () => {
      const element = document.createElement('div');
      element.id = 'above-element';
      document.body.appendChild(element);

      // Mock getBoundingClientRect to return values above viewport
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: -200,
        left: 100,
        bottom: -100,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: -200,
        toJSON: () => {},
      });

      const result = isElementVisible('above-element');

      expect(result).toBe(false);
    });

    it('returns false when element is below viewport', () => {
      const element = document.createElement('div');
      element.id = 'below-element';
      document.body.appendChild(element);

      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 600,
      });

      // Mock getBoundingClientRect to return values below viewport
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 700,
        left: 100,
        bottom: 800,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 700,
        toJSON: () => {},
      });

      const result = isElementVisible('below-element');

      expect(result).toBe(false);
    });

    it('returns false when element is to the left of viewport', () => {
      const element = document.createElement('div');
      element.id = 'left-element';
      document.body.appendChild(element);

      // Mock getBoundingClientRect to return values to the left
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: -200,
        bottom: 200,
        right: -100,
        width: 100,
        height: 100,
        x: -200,
        y: 100,
        toJSON: () => {},
      });

      const result = isElementVisible('left-element');

      expect(result).toBe(false);
    });

    it('returns false when element is to the right of viewport', () => {
      const element = document.createElement('div');
      element.id = 'right-element';
      document.body.appendChild(element);

      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Mock getBoundingClientRect to return values to the right
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: 900,
        bottom: 200,
        right: 1000,
        width: 100,
        height: 100,
        x: 900,
        y: 100,
        toJSON: () => {},
      });

      const result = isElementVisible('right-element');

      expect(result).toBe(false);
    });

    it('returns true when element is partially visible', () => {
      const element = document.createElement('div');
      element.id = 'partial-element';
      document.body.appendChild(element);

      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 600,
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Mock getBoundingClientRect to return partially visible element
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 550,
        left: 100,
        bottom: 650,
        right: 200,
        width: 100,
        height: 100,
        x: 100,
        y: 550,
        toJSON: () => {},
      });

      const result = isElementVisible('partial-element');

      expect(result).toBe(true);
    });
  });

  describe('waitForElement', () => {
    it('resolves immediately when element exists', async () => {
      const element = document.createElement('div');
      element.id = 'existing-element';
      document.body.appendChild(element);

      const result = await waitForElement('existing-element', 1000, 50);

      expect(result).toBe(element);
    });

    it('resolves with null when timeout is reached', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = waitForElement('nonexistent-element', 100, 20);
      
      vi.advanceTimersByTime(150);
      
      const result = await promise;

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Element nonexistent-element not found after 100ms'
      );
    });

    it('waits and resolves when element appears after delay', async () => {
      const elementId = 'delayed-element';
      const promise = waitForElement(elementId, 200, 20);

      // Simulate delay
      vi.advanceTimersByTime(50);
      
      const element = document.createElement('div');
      element.id = elementId;
      document.body.appendChild(element);
      
      vi.advanceTimersByTime(20);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.id).toBe(elementId);
    });

    it('uses default timeout and checkInterval', async () => {
      const element = document.createElement('div');
      element.id = 'default-params-element';
      document.body.appendChild(element);

      const result = await waitForElement('default-params-element');

      expect(result).toBe(element);
    });
  });

  describe('scrollToGameWithExpansion', () => {
    it('returns early when game path is not found', async () => {
      const nodes: FlowNode[] = [];
      const expandField = vi.fn();
      const expandStage = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await scrollToGameWithExpansion('game1', nodes, expandField, expandStage);

      expect(expandField).not.toHaveBeenCalled();
      expect(expandStage).not.toHaveBeenCalled();
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot scroll to game game1: path not found'
      );
    });

    it('expands path, waits for element, and scrolls', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const promise = scrollToGameWithExpansion('game1', nodes, expandField, expandStage, true);
      
      // Simulate element appearing
      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);
      
      vi.runAllTimers();
      
      await promise;

      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).toHaveBeenCalledWith('stage1');
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('waits for element to appear after expansion', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const promise = scrollToGameWithExpansion('game1', nodes, expandField, expandStage, true);

      // Advance timers partially
      vi.advanceTimersByTime(50);
      
      // Now add element
      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);
      
      vi.runAllTimers();
      
      await promise;

      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).toHaveBeenCalledWith('stage1');
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('uses auto scroll when smooth is false', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      const element = document.createElement('div');
      element.id = 'game-game1';
      document.body.appendChild(element);

      const promise = scrollToGameWithExpansion('game1', nodes, expandField, expandStage, false);
      
      vi.runAllTimers();
      await promise;

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('does not scroll if element never appears', async () => {
      const field = createField('field1', 'Feld 1', 0);
      const stage = createStage('stage1', 'Vorrunde', 0, 'field1');
      const game = createGame('game1', 'Match 1', 'stage1');
      const nodes: FlowNode[] = [field, stage, game];
      const expandField = vi.fn();
      const expandStage = vi.fn();

      // Don't create the element - it will timeout
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const promise = scrollToGameWithExpansion('game1', nodes, expandField, expandStage, true);
      
      vi.runAllTimers();
      await promise;

      expect(expandField).toHaveBeenCalledWith('field1');
      expect(expandStage).toHaveBeenCalledWith('stage1');
      // scrollToGame will warn but not throw
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});