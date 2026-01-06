/**
 * Tests for useEdgesState Hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgesState } from '../useEdgesState';
import { FlowEdge, FlowNode, createGameNode } from '../../types/flowchart';
import React from 'react';

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
    const updateNode = vi.fn();

    const { result, rerender } = renderHook(
      ({ edges }) => useEdgesState(edges, setEdges, updateNode),
      { initialProps: { edges } }
    );

    return { result, setEdges, updateNode, getEdges: () => edges, rerender };
  };

  describe('addGameToGameEdge', () => {
    it('creates a new GameToGameEdge', () => {
      const { result, getEdges, updateNode } = setupHook();

      act(() => {
        result.current.addGameToGameEdge('game1', 'winner', 'game2', 'home');
      });

      const edges = getEdges();
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('game1');
      expect(edges[0].target).toBe('game2');
      expect(updateNode).toHaveBeenCalledWith('game2', { homeTeamId: null });
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
