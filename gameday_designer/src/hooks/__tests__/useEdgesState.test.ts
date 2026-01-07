/**
 * Tests for useEdgesState Hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgesState } from '../useEdgesState';
import { FlowEdge, FlowNode, createGameNode } from '../../types/flowchart';

describe('useEdgesState', () => {
  const setupHook = (initialEdges: FlowEdge[] = []) => {
    let edges = initialEdges;
    const setEdges = vi.fn((update) => {
      if (typeof update === 'function') {
        edges = update(edges);
      } else {
        edges = update;
      }
    });
    const setNodes = vi.fn();

    const { result, rerender } = renderHook(
      ({ edges }) => useEdgesState(edges, setEdges, setNodes),
      { initialProps: { edges } }
    );

    return { result, setEdges, setNodes, getEdges: () => edges, rerender };
  };

  describe('addGameToGameEdge', () => {
    it('creates a new GameToGameEdge and syncs nodes', () => {
      const { result, getEdges, setNodes } = setupHook();

      act(() => {
        result.current.addGameToGameEdge('game1', 'winner', 'game2', 'home');
      });

      const edges = getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('game1');
      expect(edges[0].target).toBe('game2');
      
      // Should have called setNodes to update target game
      expect(setNodes).toHaveBeenCalled();
    });
  });

  describe('deriveDynamicRef', () => {
    it('derives winner reference', () => {
      const { result } = setupHook();
      const nodes: FlowNode[] = [
        createGameNode('game1', { x: 0, y: 0 }, { standing: 'Final' })
      ];
      const edge: FlowEdge = {
        id: 'edge1',
        source: 'game1',
        target: 'game2',
        sourceHandle: 'winner',
        targetHandle: 'home',
        type: 'gameToGame'
      };

      const ref = result.current.deriveDynamicRef(edge, nodes);
      expect(ref).toEqual({ type: 'winner', matchName: 'Final' });
    });
  });
});