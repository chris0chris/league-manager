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
} from '../types/flowchart';
import {
  createGameToGameEdge,
  createStageToGameEdge,
  isGameNode,
  isStageNode,
  StageToGameEdgeData,
} from '../types/flowchart';
import type { TeamReference } from '../types/designer';

export function useEdgesState(
  edges: FlowEdge[],
  setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>,
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
) {
  /**
   * Helper to derive a TeamReference from an edge.
   */
  const deriveDynamicRef = useCallback((edge: FlowEdge, nodes: FlowNode[]): TeamReference | null => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) return null;

    if (edge.type === 'gameToGame' && isGameNode(sourceNode)) {
      const sourceGame = sourceNode as GameNode;
      const matchName = sourceGame.data.standing || sourceNode.id;

      if (edge.sourceHandle === 'winner') {
        return { type: 'winner', matchName };
      } else if (edge.sourceHandle === 'loser') {
        return { type: 'loser', matchName };
      }
    } else if (edge.type === 'stageToGame' && isStageNode(sourceNode)) {
      const sourceStage = sourceNode as StageNode;
      const stageName = sourceStage.data.name;
      const place = (edge.data as StageToGameEdgeData).sourceRank;
      return { type: 'rank', place, stageId: sourceNode.id, stageName };
    }

    return null;
  }, []);

  /**
   * Synchronize game node dynamic references with current edges.
   * This is an atomic operation that avoids useEffect race conditions.
   */
  const syncNodesWithEdges = useCallback((currentNodes: FlowNode[], currentEdges: FlowEdge[]) => {
    setNodes(nds => nds.map(node => {
      if (!isGameNode(node)) return node;

      const homeEdge = currentEdges.find(e => e.target === node.id && e.targetHandle === 'home');
      const awayEdge = currentEdges.find(e => e.target === node.id && e.targetHandle === 'away');

      const homeTeamDynamic = homeEdge ? deriveDynamicRef(homeEdge, currentNodes) : null;
      const awayTeamDynamic = awayEdge ? deriveDynamicRef(awayEdge, currentNodes) : null;

      if (node.data.homeTeamDynamic === homeTeamDynamic && node.data.awayTeamDynamic === awayTeamDynamic) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          homeTeamDynamic,
          awayTeamDynamic,
          // Clear static IDs if dynamic is set via edge
          ...(homeTeamDynamic ? { homeTeamId: null } : {}),
          ...(awayTeamDynamic ? { awayTeamId: null } : {}),
        }
      };
    }));
  }, [deriveDynamicRef, setNodes]);

  /**
   * Add a GameToGameEdge from source game to target game.
   */
  const addGameToGameEdge = useCallback(
    (sourceGameId: string, outputType: GameOutputHandle, targetGameId: string, targetSlot: GameInputHandle): string => {
      const edgeId = `edge-${uuidv4()}`;
      const newEdge = createGameToGameEdge(edgeId, sourceGameId, outputType, targetGameId, targetSlot);

      setEdges(eds => [...eds, newEdge]);
      
      // Perform atomic sync
      setNodes(nds => {
        const updatedNodes = nds.map(node => {
          if (node.id === targetGameId && isGameNode(node)) {
            const dynamicRef = deriveDynamicRef(newEdge, nds);
            return {
              ...node,
              data: {
                ...node.data,
                [targetSlot === 'home' ? 'homeTeamDynamic' : 'awayTeamDynamic']: dynamicRef,
                [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
              }
            };
          }
          return node;
        });
        return updatedNodes;
      });

      return edgeId;
    },
    [setEdges, setNodes, deriveDynamicRef]
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

      setEdges(eds => [...eds, ...newEdges]);

      // Perform atomic sync for all affected nodes
      setNodes(nds => nds.map(node => {
        if (!isGameNode(node)) return node;
        
        const relevantNewEdges = newEdges.filter(e => e.target === node.id);
        if (relevantNewEdges.length === 0) return node;

        const newData = { ...node.data };
        relevantNewEdges.forEach(edge => {
          const dynamicRef = deriveDynamicRef(edge, nds);
          if (edge.targetHandle === 'home') {
            newData.homeTeamDynamic = dynamicRef;
            newData.homeTeamId = null;
          } else {
            newData.awayTeamDynamic = dynamicRef;
            newData.awayTeamId = null;
          }
        });

        return { ...node, data: newData };
      }));

      return newEdges.map((e) => e.id);
    },
    [setEdges, setNodes, deriveDynamicRef]
  );

  /**
   * Add a StageToGameEdge from source stage (Ranking) to target game.
   */
  const addStageToGameEdge = useCallback(
    (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: GameInputHandle): string => {
      const edgeId = `edge-${uuidv4()}`;
      const newEdge = createStageToGameEdge(edgeId, sourceStageId, sourceRank, targetGameId, targetSlot);

      setEdges(eds => [...eds, newEdge]);
      
      // Perform atomic sync
      setNodes(nds => {
        const updatedNodes = nds.map(node => {
          if (node.id === targetGameId && isGameNode(node)) {
            const dynamicRef = deriveDynamicRef(newEdge, nds);
            return {
              ...node,
              data: {
                ...node.data,
                [targetSlot === 'home' ? 'homeTeamDynamic' : 'awayTeamDynamic']: dynamicRef,
                [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
              }
            };
          }
          return node;
        });
        return updatedNodes;
      });

      return edgeId;
    },
    [setEdges, setNodes, deriveDynamicRef]
  );

  /**
   * Remove an edge (any type) targeting a specific game slot.
   */
  const removeEdgeFromSlot = useCallback(
    (targetGameId: string, targetSlot: GameInputHandle): void => {
      setEdges((eds) => eds.filter((e) => !(e.target === targetGameId && e.targetHandle === targetSlot)));
      
      // Update node data to clear dynamic ref
      setNodes(nds => nds.map(node => {
        if (node.id === targetGameId && isGameNode(node)) {
          return {
            ...node,
            data: {
              ...node.data,
              [targetSlot === 'home' ? 'homeTeamDynamic' : 'awayTeamDynamic']: null
            }
          };
        }
        return node;
      }));
    },
    [setEdges, setNodes]
  );

  /**
   * Delete an edge by ID.
   */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => {
        const edgeToDelete = eds.find(e => e.id === edgeId);
        if (edgeToDelete && (edgeToDelete.type === 'gameToGame' || edgeToDelete.type === 'stageToGame')) {
          setNodes(nds => nds.map(node => {
            if (node.id === edgeToDelete.target && isGameNode(node)) {
              return {
                ...node,
                data: {
                  ...node.data,
                  [edgeToDelete.targetHandle === 'home' ? 'homeTeamDynamic' : 'awayTeamDynamic']: null
                }
              };
            }
            return node;
          }));
        }
        return eds.filter((e) => e.id !== edgeId);
      });
    },
    [setEdges, setNodes]
  );

  /**
   * Delete all edges connected to specific node IDs.
   */
  const deleteEdgesByNodes = useCallback(
    (nodeIds: string[]) => {
      setEdges((eds) => {
        const edgesToDelete = eds.filter((e) => nodeIds.includes(e.source) || nodeIds.includes(e.target));
        
        // Sync remaining nodes (some targets might have lost their source games)
        setNodes(nds => nds.map(node => {
          if (!isGameNode(node)) return node;
          
          const lostHome = edgesToDelete.some(e => e.target === node.id && e.targetHandle === 'home');
          const lostAway = edgesToDelete.some(e => e.target === node.id && e.targetHandle === 'away');
          
          if (!lostHome && !lostAway) return node;
          
          return {
            ...node,
            data: {
              ...node.data,
              ...(lostHome ? { homeTeamDynamic: null } : {}),
              ...(lostAway ? { awayTeamDynamic: null } : {})
            }
          };
        }));

        return eds.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target));
      });
    },
    [setEdges, setNodes]
  );

  return {
    deriveDynamicRef,
    syncNodesWithEdges,
    addGameToGameEdge,
    addBulkGameToGameEdges,
    addStageToGameEdge,
    removeEdgeFromSlot,
    deleteEdge,
    deleteEdgesByNodes,
  };
}
