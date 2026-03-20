/**
 * Tests for Flowchart Container Types (Field and Stage)
 *
 * TDD RED Phase: These tests define the expected behavior for container node types.
 */

import { describe, it, expect } from 'vitest';
import type {
  FieldNodeData,
  StageNodeData,
  FieldNode,
  StageNode,
  FlowNode,
  StageType,
} from '../flowchart';
import {
  isFieldNodeData,
  isStageNodeData,
  isFieldNode,
  isStageNode,
  isGameNode,
  isContainerNode,
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
} from '../flowchart';

describe('Container Types - Field and Stage', () => {
  describe('FieldNodeData', () => {
    it('has required properties', () => {
      const data: FieldNodeData = {
        type: 'field',
        name: 'Feld 1',
        order: 0,
      };

      expect(data.type).toBe('field');
      expect(data.name).toBe('Feld 1');
      expect(data.order).toBe(0);
    });

    it('supports optional color property', () => {
      const data: FieldNodeData = {
        type: 'field',
        name: 'Feld 2',
        order: 1,
        color: '#4a90d9',
      };

      expect(data.color).toBe('#4a90d9');
    });
  });

  describe('StageNodeData', () => {
    it('has required properties', () => {
      const data: StageNodeData = {
        type: 'stage',
        name: 'Preliminary',
        category: 'preliminary',
        stageType: 'STANDARD',
        order: 0,
      };
      expect(data.type).toBe('stage');
      expect(data.name).toBe('Preliminary');
      expect(data.stageType).toBe('STANDARD');
      expect(data.order).toBe(0);
    });

    it('supports all stage types', () => {
      const stageTypes: StageType[] = ['preliminary', 'final', 'placement', 'custom'];

      stageTypes.forEach((stageType) => {
        const data: StageNodeData = {
          type: 'stage',
          name: stageType,
          stageType,
          order: 0,
        };
        expect(data.stageType).toBe(stageType);
      });
    });
  });

  describe('Type Guards', () => {
    describe('isFieldNodeData', () => {
      it('returns true for field node data', () => {
        const data: FieldNodeData = {
          type: 'field',
          name: 'Feld 1',
          order: 0,
        };
        expect(isFieldNodeData(data)).toBe(true);
      });

      it('returns false for stage node data', () => {
        const data: StageNodeData = {
          type: 'stage',
          name: 'Preliminary',
          category: 'preliminary',
          order: 0,
        };
        expect(isFieldNodeData(data)).toBe(false);
      });

      it('returns false for game node data', () => {
        const data = {
          type: 'game',
          stage: 'Preliminary',
          standing: 'HF1',
          fieldId: null,
          official: null,
          breakAfter: 0,
        };
        expect(isFieldNodeData(data as unknown as FieldNodeData)).toBe(false);
      });
    });

    describe('isStageNodeData', () => {
      it('returns true for stage node data', () => {
        const data: StageNodeData = {
          type: 'stage',
          name: 'Final',
          category: 'final',
          order: 1,
        };
        expect(isStageNodeData(data)).toBe(true);
      });

      it('returns false for field node data', () => {
        const data: FieldNodeData = {
          type: 'field',
          name: 'Feld 1',
          order: 0,
        };
        expect(isStageNodeData(data)).toBe(false);
      });

      it('returns false for team node data', () => {
        const data = {
          type: 'team',
          reference: { type: 'static', name: 'Team A' },
          label: 'Team A',
        };
        expect(isStageNodeData(data as unknown as StageNodeData)).toBe(false);
      });
    });

    describe('isFieldNode', () => {
      it('returns true for field node', () => {
        const node: FieldNode = {
          id: 'field-1',
          type: 'field',
          position: { x: 0, y: 0 },
          data: {
            type: 'field',
            name: 'Feld 1',
            order: 0,
          },
          style: { width: 350, height: 300 },
        };
        expect(isFieldNode(node)).toBe(true);
      });

      it('returns false for stage node', () => {
        const node: StageNode = {
          id: 'stage-1',
          type: 'stage',
          parentId: 'field-1',
          position: { x: 20, y: 60 },
          data: {
            type: 'stage',
            name: 'Preliminary',
            category: 'preliminary',
            order: 0,
          },
          style: { width: 300, height: 150 },
        };
        expect(isFieldNode(node as FlowNode)).toBe(false);
      });
    });

    describe('isStageNode', () => {
      it('returns true for stage node', () => {
        const node: StageNode = {
          id: 'stage-1',
          type: 'stage',
          parentId: 'field-1',
          position: { x: 20, y: 60 },
          data: {
            type: 'stage',
            name: 'Final',
            category: 'final',
            order: 0,
          },
          style: { width: 300, height: 150 },
        };
        expect(isStageNode(node)).toBe(true);
      });

      it('returns false for field node', () => {
        const node: FieldNode = {
          id: 'field-1',
          type: 'field',
          position: { x: 0, y: 0 },
          data: {
            type: 'field',
            name: 'Feld 1',
            order: 0,
          },
          style: { width: 350, height: 300 },
        };
        expect(isStageNode(node as FlowNode)).toBe(false);
      });
    });

    describe('isContainerNode', () => {
      it('returns true for field node', () => {
        const node: FieldNode = {
          id: 'field-1',
          type: 'field',
          position: { x: 0, y: 0 },
          data: {
            type: 'field',
            name: 'Feld 1',
            order: 0,
          },
          style: { width: 350, height: 300 },
        };
        expect(isContainerNode(node)).toBe(true);
      });

      it('returns true for stage node', () => {
        const node: StageNode = {
          id: 'stage-1',
          type: 'stage',
          parentId: 'field-1',
          position: { x: 20, y: 60 },
          data: {
            type: 'stage',
            name: 'Preliminary',
            category: 'preliminary',
            order: 0,
          },
          style: { width: 300, height: 150 },
        };
        expect(isContainerNode(node)).toBe(true);
      });

      it('returns false for game node', () => {
        const node = {
          id: 'game-1',
          type: 'game',
          position: { x: 100, y: 100 },
          data: {
            type: 'game',
            stage: 'Preliminary',
            standing: 'HF1',
            fieldId: null,
            official: null,
            breakAfter: 0,
          },
        };
        expect(isContainerNode(node as FlowNode)).toBe(false);
      });

      it('returns false for team node', () => {
        const node = {
          id: 'team-1',
          type: 'team',
          position: { x: 0, y: 0 },
          data: {
            type: 'team',
            reference: { type: 'static', name: 'A' },
            label: 'A',
          },
        };
        expect(isContainerNode(node as FlowNode)).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createFieldNode', () => {
      it('creates a field node with default values', () => {
        const node = createFieldNode('field-1');

        expect(node.id).toBe('field-1');
        expect(node.type).toBe('field');
        expect(node.position).toEqual({ x: 50, y: 50 });
        expect(node.data.type).toBe('field');
        expect(node.data.name).toBe('Feld 1');
        expect(node.data.order).toBe(0);
        expect(node.style).toEqual({ width: 350, height: 300 });
        expect(node.draggable).toBe(false);
        expect(node.selectable).toBe(true);
      });

      it('creates a field node with custom name', () => {
        const node = createFieldNode('field-2', { name: 'Main Field' });

        expect(node.data.name).toBe('Main Field');
      });

      it('creates a field node with custom position', () => {
        const node = createFieldNode('field-3', undefined, { x: 400, y: 100 });

        expect(node.position).toEqual({ x: 400, y: 100 });
      });

      it('creates a field node with order', () => {
        const node = createFieldNode('field-4', { name: 'Feld 2', order: 1 });

        expect(node.data.order).toBe(1);
      });

      it('creates a field node with color', () => {
        const node = createFieldNode('field-5', { color: '#ff0000' });

        expect(node.data.color).toBe('#ff0000');
      });
    });

    describe('createStageNode', () => {
      it('creates a stage node with required parent ID', () => {
        const node = createStageNode('stage-1', 'field-1');

        expect(node.id).toBe('stage-1');
        expect(node.type).toBe('stage');
        expect(node.parentId).toBe('field-1');
        expect(node.position).toEqual({ x: 20, y: 60 });
        expect(node.data.type).toBe('stage');
        expect(node.data.name).toBe('Preliminary');
        expect(node.data.stageType).toBe('STANDARD');
        expect(node.data.order).toBe(0);
        expect(node.style).toEqual({ width: 300, height: 150 });
        expect(node.extent).toBe('parent');
        expect(node.expandParent).toBe(true);
        expect(node.draggable).toBe(false);
        expect(node.selectable).toBe(true);
      });

      it('creates a stage node with custom name and type', () => {
        const node = createStageNode('stage-2', 'field-1', {
          name: 'Final',
          category: 'final',
        });

        expect(node.data.name).toBe('Final');
        expect(node.data.stageType).toBe('STANDARD');
      });

      it('creates a stage node with custom position', () => {
        const node = createStageNode('stage-3', 'field-1', undefined, { x: 30, y: 200 });

        expect(node.position).toEqual({ x: 30, y: 200 });
      });

      it('creates a stage node with order', () => {
        const node = createStageNode('stage-4', 'field-1', { order: 2 });

        expect(node.data.order).toBe(2);
      });

      it('creates a placement stage', () => {
        const node = createStageNode('stage-5', 'field-1', {
          name: 'Platzierung',
          category: 'placement',
        });

        expect(node.data.stageType).toBe('STANDARD');
      });

      it('creates a custom stage', () => {
        const node = createStageNode('stage-6', 'field-1', {
          name: 'Gruppenphase',
          category: 'custom',
        });

        expect(node.data.stageType).toBe('STANDARD');
        expect(node.data.name).toBe('Gruppenphase');
      });
    });

    describe('createGameNodeInStage', () => {
      it('creates a game node with parent stage', () => {
        const node = createGameNodeInStage('game-1', 'stage-1');

        expect(node.id).toBe('game-1');
        expect(node.type).toBe('game');
        expect(node.parentId).toBe('stage-1');
        expect(node.extent).toBe('parent');
        expect(node.expandParent).toBe(true);
        expect(node.position).toEqual({ x: 30, y: 50 });
      });

      it('creates a game node with custom standing', () => {
        const node = createGameNodeInStage('game-2', 'stage-1', {
          standing: 'HF1',
        });

        expect(node.data.standing).toBe('HF1');
      });

      it('creates a game node with custom position', () => {
        const node = createGameNodeInStage('game-3', 'stage-1', undefined, { x: 50, y: 100 });

        expect(node.position).toEqual({ x: 50, y: 100 });
      });

      it('creates a game node with all options', () => {
        const node = createGameNodeInStage('game-4', 'stage-1', {
          standing: 'Finale',
          official: { type: 'static', name: 'Refs' },
          breakAfter: 10,
        });

        expect(node.data.standing).toBe('Finale');
        expect(node.data.official).toEqual({ type: 'static', name: 'Refs' });
        expect(node.data.breakAfter).toBe(10);
      });
    });

  });

  describe('Node Hierarchy', () => {
    it('FieldNode has correct structure for React Flow', () => {
      const node: FieldNode = {
        id: 'field-1',
        type: 'field',
        position: { x: 50, y: 50 },
        data: {
          type: 'field',
          name: 'Feld 1',
          order: 0,
        },
        style: { width: 350, height: 300 },
        draggable: false,
        selectable: true,
      };

      // No parentId for field nodes (top-level container)
      expect(node.parentId).toBeUndefined();
      // Must have style for dimensions
      expect(node.style).toBeDefined();
      expect(node.style?.width).toBeGreaterThanOrEqual(300);
      expect(node.style?.height).toBeGreaterThanOrEqual(200);
    });

    it('StageNode has correct structure for React Flow sub-flow', () => {
      const node: StageNode = {
        id: 'stage-1',
        type: 'stage',
        parentId: 'field-1',
        position: { x: 20, y: 60 },
        data: {
          type: 'stage',
          name: 'Preliminary',
          category: 'preliminary',
          order: 0,
        },
        style: { width: 300, height: 150 },
        extent: 'parent',
        expandParent: true,
        draggable: false,
        selectable: true,
      };

      // Must have parentId pointing to a field
      expect(node.parentId).toBe('field-1');
      // Must be constrained to parent
      expect(node.extent).toBe('parent');
      // Should auto-expand parent
      expect(node.expandParent).toBe(true);
    });
  });

  describe('FlowNode Union Type', () => {
    it('accepts field, stage, and game node types', () => {
      const fieldNode = createFieldNode('field-1');
      const stageNode = createStageNode('stage-1', 'field-1');
      const gameNode = createGameNodeInStage('game-1', 'stage-1');

      const nodes: FlowNode[] = [fieldNode, stageNode, gameNode];

      expect(nodes).toHaveLength(3);
      expect(isFieldNode(nodes[0])).toBe(true);
      expect(isStageNode(nodes[1])).toBe(true);
      expect(isGameNode(nodes[2])).toBe(true);

      // Field and Stage are container nodes
      expect(isContainerNode(nodes[0])).toBe(true);
      expect(isContainerNode(nodes[1])).toBe(true);
      expect(isContainerNode(nodes[2])).toBe(false); // Game is not a container
    });
  });
});
