/**
 * useEdgesState Hook
 *
 * Specialized hook for managing edge-related state and operations:
 * - Edge CRUD (set, delete)
 * - Game-to-game edge creation (winner/loser connections)
 * - Dynamic reference derivation
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  FlowEdge,
  GameNode,
  GameInputHandle,
  GameOutputHandle,
  GameNodeData,
} from '../types/flowchart';
import { createGameToGameEdge, isGameNode } from '../types/flowchart';
import type { TeamReference } from '../types/designer';

export function useEdgesState(
  edges: FlowEdge[],
  setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>,
  updateNode: (nodeId: string, data: Partial<GameNodeData>) => void
) {
  /**
   * Helper to derive a TeamReference from a GameToGameEdge.
   */
  const deriveDynamicRef = useCallback((edge: FlowEdge, nodes: FlowNode[]): TeamReference | null => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode || !isGameNode(sourceNode)) return null;

    const sourceGame = sourceNode as GameNode;
    const matchName = sourceGame.data.standing || sourceNode.id;

    if (edge.sourceHandle === 'winner') {
      return { type: 'winner', matchName };
    } else if (edge.sourceHandle === 'loser') {
      return { type: 'loser', matchName };
    }

    return null;
  }, []);

  /**
   * Add a GameToGameEdge from source game to target game.
   */
  const addGameToGameEdge = useCallback(
    (sourceGameId: string, outputType: GameOutputHandle, targetGameId: string, targetSlot: GameInputHandle): string => {
      const edgeId = `edge-${uuidv4()}`;
      const newEdge = createGameToGameEdge(edgeId, sourceGameId, outputType, targetGameId, targetSlot);

      setEdges((eds) => [...eds, newEdge]);

      // Clear static team assignment for this slot
      updateNode(targetGameId, {
        [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
      });

      return edgeId;
    },
    [setEdges, updateNode]
  );

  /**
   * Add multiple GameToGameEdges at once (bulk operation).
   */
  const addBulkGameToGameEdges = useCallback(
    (edgesToAdd: Array<{
      sourceGameId: string;
      outputType: GameOutputHandle;
      targetGameId: string;
      targetSlot: GameInputHandle;
    }>): string[] => {
      if (edgesToAdd.length === 0) return [];

      const newEdges = edgesToAdd.map(({ sourceGameId, outputType, targetGameId, targetSlot }) => {
        const edgeId = `edge-${uuidv4()}`;
        return createGameToGameEdge(edgeId, sourceGameId, outputType, targetGameId, targetSlot);
      });

      setEdges((eds) => [...eds, ...newEdges]);

      // Clear static team assignments for all affected slots
      edgesToAdd.forEach(({ targetGameId, targetSlot }) => {
        updateNode(targetGameId, {
          [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
        });
      });

      return newEdges.map((e) => e.id);
    },
    [setEdges, updateNode]
  );

  /**
   * Remove a GameToGameEdge targeting a specific game slot.
   */
  const removeGameToGameEdge = useCallback(
    (targetGameId: string, targetSlot: GameInputHandle): void => {
      setEdges((eds) => eds.filter((e) => !(e.target === targetGameId && e.targetHandle === targetSlot)));
    },
    [setEdges]
  );

  /**
   * Delete an edge by ID.
   */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  /**
   * Delete all edges connected to specific node IDs.
   */
  const deleteEdgesByNodes = useCallback(
    (nodeIds: string[]) => {
      setEdges((eds) => eds.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
    },
    [setEdges]
  );

  return {
    deriveDynamicRef,
    addGameToGameEdge,
    addBulkGameToGameEdges,
    removeGameToGameEdge,
    deleteEdge,
    deleteEdgesByNodes,
  };
}
