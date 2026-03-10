/**
 * Tests for useNodesState Hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodesState } from '../useNodesState';
import {
  isFieldNode,
  isStageNode,
} from '../../types/flowchart';
import type { FlowNode, GameNode } from '../../types/flowchart';

describe('useNodesState', () => {
  const setupHook = (initialNodes: FlowNode[] = []) => {
    let nodes = initialNodes;
    const setNodes = vi.fn((update) => {
      if (typeof update === 'function') {
        nodes = update(nodes);
      } else {
        nodes = update;
      }
    });

    const onNodesDeleted = vi.fn();

    const { result, rerender } = renderHook(
      ({ nodes }) => useNodesState(nodes, setNodes, onNodesDeleted),
      { initialProps: { nodes } }
    );

    return { result, setNodes, getNodes: () => nodes, rerender, onNodesDeleted };
  };

  describe('addFieldNode', () => {
    it('creates a field container node', () => {
      const { result, getNodes } = setupHook();

      act(() => {
        result.current.addFieldNode();
      });

      const nodes = getNodes();
      expect(nodes).toHaveLength(1);
      expect(isFieldNode(nodes[0])).toBe(true);
      expect(nodes[0].data.name).toBe('Feld 1');
    });

    it('creates field with stage by default', () => {
      const { result, getNodes } = setupHook();

      act(() => {
        result.current.addFieldNode(undefined, true);
      });

      const nodes = getNodes();
      expect(nodes).toHaveLength(2);
      expect(isFieldNode(nodes[0])).toBe(true);
      expect(isStageNode(nodes[1])).toBe(true);
      expect(nodes[1].parentId).toBe(nodes[0].id);
    });
  });

  describe('addStageNode', () => {
    it('creates a stage inside a field', () => {
      const { result, getNodes, rerender } = setupHook();

      let fieldId: string = '';
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      rerender({ nodes: getNodes() });

      act(() => {
        result.current.addStageNode(fieldId);
      });

      const nodes = getNodes();
      const stage = nodes.find(isStageNode);
      expect(stage).toBeDefined();
      expect(stage?.parentId).toBe(fieldId);
    });

    it('sets custom category for second stage', () => {
      const { result, getNodes, rerender } = setupHook();
      let fid = '';
      act(() => { fid = result.current.addFieldNode().id; });
      rerender({ nodes: getNodes() });
      act(() => { result.current.addStageNode(fid); }); // First
      rerender({ nodes: getNodes() });
      act(() => { result.current.addStageNode(fid); }); // Second
      rerender({ nodes: getNodes() });
      act(() => { result.current.addStageNode(fid); }); // Third -> Custom
      
      const nodes = getNodes();
      const stages = nodes.filter(isStageNode);
      expect(stages[1].data.name).toBe('Final');
      expect(stages[2].data.category).toBe('custom');
    });
  });

  describe('updateNode', () => {
    it('updates node data', () => {
      const { result, getNodes, rerender } = setupHook();

      let fieldId: string = '';
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      rerender({ nodes: getNodes() });

      act(() => {
        result.current.updateNode(fieldId, { name: 'Updated Field' });
      });

      const nodes = getNodes();
      expect(nodes[0].data.name).toBe('Updated Field');
    });
  });

  describe('deleteNode', () => {
    it('deletes field and its children', () => {
      const { result, getNodes, rerender, onNodesDeleted } = setupHook();

      let fieldId: string = '';
      act(() => {
        fieldId = result.current.addFieldNode(undefined, true).id;
      });

      rerender({ nodes: getNodes() });

      expect(getNodes()).toHaveLength(2);

      act(() => {
        result.current.deleteNode(fieldId);
      });

      expect(getNodes()).toHaveLength(0);
      expect(onNodesDeleted).toHaveBeenCalled();
    });

    it('cascades deletion from stage to games', () => {
      const { result, getNodes, rerender } = setupHook();
      let stageId = '';
      let fieldId = '';
      act(() => { 
        fieldId = result.current.addFieldNode().id;
      });
      rerender({ nodes: getNodes() });
      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });
      rerender({ nodes: getNodes() });
      act(() => { result.current.addGameNodeInStage(stageId); });
      rerender({ nodes: getNodes() });
      
      expect(getNodes()).toHaveLength(3);
      act(() => { result.current.deleteNode(stageId); });
      expect(getNodes()).toHaveLength(1); // Only field left
    });

    it('triggers onEdgesDeleted callback', () => {
      const { result, getNodes, rerender } = setupHook();
      const mockOnEdgesDeleted = vi.fn();
      let fieldId = '';
      act(() => { fieldId = result.current.addFieldNode().id; });
      rerender({ nodes: getNodes() });
      act(() => { result.current.deleteNode(fieldId, mockOnEdgesDeleted); });
      expect(mockOnEdgesDeleted).toHaveBeenCalled();
    });
  });

  describe('ensureContainerHierarchy', () => {
    it('creates field and stage when empty', () => {
      const { result, getNodes } = setupHook();
      let ids: { fieldId: string; stageId: string } | null = null;
      
      act(() => {
        ids = result.current.ensureContainerHierarchy(null);
      });

      expect(ids).not.toBeNull();
      expect(getNodes().find(n => n.id === ids?.fieldId)).toBeDefined();
      expect(getNodes().find(n => n.id === ids?.stageId)).toBeDefined();
    });

    it('adds stage to existing field if missing', () => {
      const { result, getNodes, rerender } = setupHook();
      let fieldId: string = '';
      
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });
      
      rerender({ nodes: getNodes() });
      expect(getNodes()).toHaveLength(1);

      let ids: { fieldId: string; stageId: string } | null = null;
      act(() => {
        ids = result.current.ensureContainerHierarchy(fieldId);
      });

      expect(ids?.fieldId).toBe(fieldId);
      expect(getNodes()).toHaveLength(2); // Field + new Stage
    });

    it('creates stage in existing field even if not selected', () => {
      const { result, getNodes, rerender } = setupHook();
      let fieldId: string = '';
      act(() => { fieldId = result.current.addFieldNode().id; });
      rerender({ nodes: getNodes() });
      
      let ids: { fieldId: string; stageId: string } | null = null;
      act(() => { ids = result.current.ensureContainerHierarchy(null); });
      expect(ids?.fieldId).toBe(fieldId);
      expect(getNodes()).toHaveLength(2);
    });

    it('returns existing IDs if hierarchy already exists', () => {
      const { result, getNodes, rerender } = setupHook();
      let fieldId: string = '';
      let stageId: string = '';
      
      act(() => {
        const field = result.current.addFieldNode(undefined, true);
        fieldId = field.id;
      });
      
      rerender({ nodes: getNodes() });
      stageId = getNodes().find(n => n.type === 'stage')!.id;

      let ids: { fieldId: string; stageId: string } | null = null;
      act(() => {
        ids = result.current.ensureContainerHierarchy(stageId);
      });

      expect(ids?.fieldId).toBe(fieldId);
      expect(ids?.stageId).toBe(stageId);
      expect(getNodes()).toHaveLength(2);
    });

    it('returns first stage if invalid ID is passed but hierarchy exists', () => {
      const { result, getNodes, rerender } = setupHook();
      let fieldId = '';
      act(() => {
        const f = result.current.addFieldNode(undefined, true);
        fieldId = f.id;
      });
      rerender({ nodes: getNodes() });
      const stageId = getNodes().find(n => n.parentId === fieldId && isStageNode(n))!.id;

      let ids: { fieldId: string; stageId: string } | null = null;
      act(() => {
        ids = result.current.ensureContainerHierarchy('invalid-id');
      });
      expect(ids?.fieldId).toBe(fieldId);
      expect(ids?.stageId).toBe(stageId);
    });
  });

  describe('addGameNodeInStage', () => {
    it('creates hierarchy if stageId is missing', () => {
      const { result, getNodes } = setupHook();
      act(() => { result.current.addGameNodeInStage(); });
      expect(getNodes()).toHaveLength(3); // field, stage, game
    });
  });

  describe('addBulkTournament', () => {
    it('adds multiple nodes at once', () => {
      const { result, getNodes } = setupHook();
      const structure = {
        // @ts-expect-error - testing bulk add with partial objects
        fields: [{ id: 'f1', type: 'field', data: { name: 'F1' } } as unknown as FieldNode],
        // @ts-expect-error - testing bulk add with partial objects
        stages: [{ id: 's1', type: 'stage', data: { name: 'S1' } } as unknown as StageNode],
        // @ts-expect-error - testing bulk add with partial objects
        games: [{ id: 'g1', type: 'game', data: { standing: 'G1' } } as unknown as GameNode],
      };
      act(() => { result.current.addBulkTournament(structure); });
      expect(getNodes()).toHaveLength(3);
    });
  });

  describe('updateNode time recalculation', () => {
    it('recalculates game times and sorts by standing', () => {
      const { result, getNodes, rerender } = setupHook();
      let sId = '';
      let g1Id = '', g2Id = '';
      let fId = '';
      act(() => { 
        fId = result.current.addFieldNode().id;
      });
      rerender({ nodes: getNodes() });
      act(() => {
        const s = result.current.addStageNode(fId, { name: 'S1' })!;
        sId = s.id;
      });
      rerender({ nodes: getNodes() });
      act(() => { g2Id = result.current.addGameNodeInStage(sId, { standing: '2' }).id; });
      rerender({ nodes: getNodes() });
      act(() => { g1Id = result.current.addGameNodeInStage(sId, { standing: '1' }).id; });
      rerender({ nodes: getNodes() });

      // Sort should ensure G1 (standing '1') is first and G2 (standing '2') is second
      act(() => { result.current.updateNode(sId, { startTime: '10:00' }); });
      rerender({ nodes: getNodes() });

      const nodes = getNodes();
      const g1 = nodes.find(n => n.id === g1Id) as GameNode;
      const g2 = nodes.find(n => n.id === g2Id) as GameNode;
      expect(g1.data.startTime).toBe('10:00');
      expect(g2.data.startTime).not.toBe('10:00'); // G2 should be after G1
    });

    it('recalculates game times when game duration changes', () => {
      const { result, getNodes, rerender } = setupHook();
      let sId = '';
      let g1Id = '';
      let g2Id = '';
      let fId = '';
      act(() => { fId = result.current.addFieldNode().id; });
      rerender({ nodes: getNodes() });
      act(() => {
        const s = result.current.addStageNode(fId, { name: 'S1' })!;
        sId = s.id;
      });
      rerender({ nodes: getNodes() });
      act(() => {
        result.current.updateNode(sId, { startTime: '10:00' });
      });
      rerender({ nodes: getNodes() });
      act(() => { g1Id = result.current.addGameNodeInStage(sId, { standing: '1' }).id; });
      rerender({ nodes: getNodes() });
      act(() => { g2Id = result.current.addGameNodeInStage(sId, { standing: '2' }).id; });
      rerender({ nodes: getNodes() });

      // G1 at 10:00, G2 at 11:10 (default 70m)
      act(() => { result.current.updateNode(g1Id, { duration: 60 }); });
      rerender({ nodes: getNodes() });

      const g2 = getNodes().find(n => n.id === g2Id) as GameNode;
      expect(g2.data.startTime).toBe('11:00');
    });
  });

  describe('hierarchy queries', () => {
    it('getTargetStage returns stage for selected game', () => {
      const { result, getNodes, rerender } = setupHook();
      let gId = '';
      let fId = '';
      let sId = '';
      act(() => {
        fId = result.current.addFieldNode().id;
      });
      rerender({ nodes: getNodes() });
      act(() => {
        sId = result.current.addStageNode(fId)!.id;
      });
      rerender({ nodes: getNodes() });
      act(() => { gId = result.current.addGameNodeInStage(sId).id; });
      rerender({ nodes: getNodes() });

      const target = result.current.getTargetStage(gId);
      expect(target?.id).toBe(sId);
    });

    it('getGameField and getGameStage return parent containers', () => {
      const { result, getNodes, rerender } = setupHook();
      let gId = '';
      let fId = '';
      let sId = '';
      act(() => {
        fId = result.current.addFieldNode().id;
      });
      rerender({ nodes: getNodes() });
      act(() => {
        sId = result.current.addStageNode(fId)!.id;
      });
      rerender({ nodes: getNodes() });
      act(() => { gId = result.current.addGameNodeInStage(sId).id; });
      rerender({ nodes: getNodes() });

      expect(result.current.getGameField(gId)?.id).toBe(fId);
      expect(result.current.getGameStage(gId)?.id).toBe(sId);
    });
  });
});