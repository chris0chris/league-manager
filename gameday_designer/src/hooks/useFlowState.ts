/**
 * useFlowState Hook
 *
 * Manages the state of the flowchart designer including:
 * - Nodes (teams and games)
 * - Edges (connections)
 * - Fields
 * - Selection state
 *
 * Provides actions for adding, updating, and removing nodes/edges/fields.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  FlowEdge,
  FlowField,
  FlowState,
  TeamNodeData,
  GameNodeData,
  FieldNodeData,
  StageNodeData,
  FieldNode,
  StageNode,
  GameNode,
  TeamNode,
  SelectionState,
  StageType,
  GlobalTeam,
  GlobalTeamGroup,
} from '../types/flowchart';
import {
  createGameNode,
  createFlowField,
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  createGameToGameEdge,
  isTeamNode,
  isGameNode,
  isFieldNode,
  isStageNode,
} from '../types/flowchart';
import type { TeamReference } from '../types/designer';
import { recalculateStageGameTimes } from '../utils/timeCalculation';
import type { TournamentStructure } from '../utils/tournamentGenerator';

/**
 * Options for adding a field node.
 */
export interface AddFieldOptions {
  name?: string;
  color?: string;
}

/**
 * Options for adding a stage node.
 */
export interface AddStageOptions {
  name?: string;
  stageType?: StageType;
}

/**
 * Return type of useFlowState hook.
 */
export interface UseFlowStateReturn {
  // State
  nodes: FlowNode[];
  edges: FlowEdge[];
  fields: FlowField[];
  selectedNode: FlowNode | null;
  selection: SelectionState;

  // Callbacks (for compatibility)
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;

  // Node actions
  addGameNode: (options?: Partial<Omit<GameNodeData, 'type'>>) => FlowNode;
  updateNode: (nodeId: string, data: Partial<TeamNodeData | GameNodeData | FieldNodeData | StageNodeData>) => void;
  deleteNode: (nodeId: string) => void;

  // Container node actions (v2)
  addFieldNode: (options?: AddFieldOptions, includeStage?: boolean) => FieldNode;
  addStageNode: (fieldId: string, options?: AddStageOptions) => StageNode | null;
  addGameNodeInStage: (stageId?: string, options?: Partial<Omit<GameNodeData, 'type'>>) => GameNode;
  addBulkGames: (games: GameNode[]) => void;
  addBulkTournament: (structure: TournamentStructure) => void;

  // Container hierarchy helpers (v2)
  getTargetStage: () => StageNode | null;
  ensureContainerHierarchy: () => { fieldId: string; stageId: string };
  moveNodeToStage: (nodeId: string, stageId: string) => void;

  // Container queries (v2)
  getGameField: (gameId: string) => FieldNode | null;
  getGameStage: (gameId: string) => StageNode | null;
  getTeamField: (teamId: string) => FieldNode | null;
  getTeamStage: (teamId: string) => StageNode | null;
  getFieldStages: (fieldId: string) => StageNode[];
  getStageGames: (stageId: string) => GameNode[];
  selectedContainerField: FieldNode | null;
  selectedContainerStage: StageNode | null;

  // Edge actions
  setEdges: (edges: FlowEdge[]) => void;
  deleteEdge: (edgeId: string) => void;
  addGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => string;
  addBulkGameToGameEdges: (edgesToAdd: Array<{
    sourceGameId: string;
    outputType: 'winner' | 'loser';
    targetGameId: string;
    targetSlot: 'home' | 'away';
  }>) => string[];
  removeGameToGameEdge: (targetGameId: string, targetSlot: 'home' | 'away') => void;

  // Field actions (legacy, kept for compatibility)
  addField: (name: string) => FlowField;
  updateField: (fieldId: string, name: string) => void;
  deleteField: (fieldId: string) => void;

  // Selection actions
  setSelection: (selection: SelectionState) => void;
  selectNode: (nodeId: string | null) => void;

  // Global team pool actions (v2)
  globalTeams: GlobalTeam[];
  addGlobalTeam: (label?: string, groupId?: string | null) => GlobalTeam;
  updateGlobalTeam: (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => void;
  deleteGlobalTeam: (teamId: string) => void;
  reorderGlobalTeam: (teamId: string, direction: 'up' | 'down') => void;

  // Global team group actions (v2)
  globalTeamGroups: GlobalTeamGroup[];
  addGlobalTeamGroup: (name?: string) => GlobalTeamGroup;
  updateGlobalTeamGroup: (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => void;
  deleteGlobalTeamGroup: (groupId: string) => void;
  reorderGlobalTeamGroup: (groupId: string, direction: 'up' | 'down') => void;

  // Team assignment actions (v2)
  assignTeamToGame: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  unassignTeamFromGame: (gameId: string, slot: 'home' | 'away') => void;
  getTeamUsage: (teamId: string) => { gameId: string; slot: 'home' | 'away' }[];

  // Bulk actions
  clearAll: () => void;
  importState: (state: FlowState) => void;
  exportState: () => FlowState;

  // Derived data
  matchNames: string[];
  groupNames: string[];
}

/**
 * Calculate a position for a new node.
 */
function calculateNewNodePosition(
  existingNodes: FlowNode[],
  nodeType: 'team' | 'game'
): { x: number; y: number } {
  // Default starting positions
  const baseX = nodeType === 'team' ? 50 : 300;
  const baseY = 50;
  const offsetY = 150;

  // Count existing nodes of same type
  const sameTypeNodes = existingNodes.filter((n) =>
    nodeType === 'team' ? isTeamNode(n) : isGameNode(n)
  );

  return {
    x: baseX,
    y: baseY + sameTypeNodes.length * offsetY,
  };
}

/**
 * useFlowState hook.
 *
 * Manages the complete state of the flowchart designer.
 */
export function useFlowState(initialState?: Partial<FlowState>): UseFlowStateReturn {
   // Node and edge state
  const [nodes, setNodes] = useState<FlowNode[]>(initialState?.nodes ?? []);
  const [edges, setEdges] = useState<FlowEdge[]>(initialState?.edges ?? []);

  // Placeholder callbacks (not needed for list view)
  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  // Field state
  const [fields, setFields] = useState<FlowField[]>(initialState?.fields ?? []);

  // Global team pool state (v2)
  const [globalTeams, setGlobalTeams] = useState<GlobalTeam[]>(initialState?.globalTeams ?? []);

  // Global team groups state
  const [globalTeamGroups, setGlobalTeamGroups] = useState<GlobalTeamGroup[]>(
    initialState?.globalTeamGroups ?? []
  );

  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    nodeIds: [],
    edgeIds: [],
  });

  // ============================================================================
  // Edge synchronization (v2)
  // ============================================================================

  /**
   * Sync dynamic team references when GameToGameEdges change.
   * Updates homeTeamDynamic/awayTeamDynamic fields on game nodes.
   */
  useEffect(() => {
    console.log('[useEffect edges sync] Running with', edges.length, 'edges');
    setNodes((nds) =>
      nds.map((n) => {
        if (!isGameNode(n)) return n;

        // Find edges targeting this game's home/away handles
        const homeEdge = edges.find(
          (e) => e.type === 'gameToGame' && e.target === n.id && e.targetHandle === 'home'
        );
        const awayEdge = edges.find(
          (e) => e.type === 'gameToGame' && e.target === n.id && e.targetHandle === 'away'
        );

        if (homeEdge || awayEdge) {
          console.log('[useEffect edges sync] Processing game:', (n.data as GameNodeData).standing, {
            hasHomeEdge: !!homeEdge,
            hasAwayEdge: !!awayEdge,
            gameId: n.id
          });
        }

        // Derive dynamic team references from edges
        const homeTeamDynamic = homeEdge ? deriveDynamicRef(homeEdge, nds) : null;
        const awayTeamDynamic = awayEdge ? deriveDynamicRef(awayEdge, nds) : null;

        if (homeTeamDynamic || awayTeamDynamic) {
          console.log('[useEffect edges sync] Derived refs for', (n.data as GameNodeData).standing, {
            homeTeamDynamic,
            awayTeamDynamic
          });
        }

        // Only update if dynamic refs changed
        const data = n.data as GameNodeData;
        if (
          data.homeTeamDynamic === homeTeamDynamic &&
          data.awayTeamDynamic === awayTeamDynamic
        ) {
          return n;
        }

        return {
          ...n,
          data: {
            ...data,
            homeTeamDynamic,
            awayTeamDynamic,
          },
        };
      })
    );
  }, [edges]);

  /**
   * Helper to derive a TeamReference from a GameToGameEdge.
   */
  function deriveDynamicRef(edge: FlowEdge, nodes: FlowNode[]): TeamReference | null {
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
  }

  // ============================================================================
  // Derived data
  // ============================================================================

  /**
   * Get all match names from game nodes.
   */
  const matchNames = useMemo(() => {
    return nodes
      .filter(isGameNode)
      .map((node) => (node.data as GameNodeData).standing)
      .filter((standing) => standing && standing.trim() !== '');
  }, [nodes]);

  /**
   * Get group names for tournament standings (static list).
   * Note: This is different from globalTeamGroups (which organize teams in UI).
   * This is for referencing tournament groups in standings (e.g., "1st place in Gruppe A").
   */
  const groupNames = useMemo(() => {
    return ['Gruppe 1', 'Gruppe 2', 'Gruppe A', 'Gruppe B'];
  }, []);

  /**
   * Get the currently selected node (first in selection).
   */
  const selectedNode = useMemo(() => {
    if (selection.nodeIds.length === 0) {
      return null;
    }
    return nodes.find((n) => n.id === selection.nodeIds[0]) ?? null;
  }, [nodes, selection.nodeIds]);

  // ============================================================================
  // Node actions
  // ============================================================================

  // addTeamNode removed - teams are now managed in global team pool (v2)

  /**
   * Add a new game node.
   */
  const addGameNode = useCallback(
    (options?: Partial<Omit<GameNodeData, 'type'>>): FlowNode => {
      const id = `game-${uuidv4()}`;
      const position = calculateNewNodePosition(nodes, 'game');

      // Auto-generate standing if not provided
      const gameCount = nodes.filter(isGameNode).length;
      const standing = options?.standing ?? `Game ${gameCount + 1}`;

      const newNode = createGameNode(id, position, {
        ...options,
        standing,
      });

      setNodes((nds) => [...nds, newNode]);

      return newNode;
    },
    [nodes, setNodes]
  );

  /**
   * Update a node's data.
   */
  const updateNode = useCallback(
    (nodeId: string, data: Partial<TeamNodeData | GameNodeData | FieldNodeData | StageNodeData>) => {
      setNodes((prevNodes) => {
        // First, apply the update
        const updatedNodes = prevNodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        });

        // Check if we need to recalculate game times
        const updatedNode = updatedNodes.find((n) => n.id === nodeId);

        // Case 1: Stage start time changed - recalculate all games in this stage
        if (updatedNode && isStageNode(updatedNode) && 'startTime' in data) {
          const stage = updatedNode;
          const games = updatedNodes.filter(
            (n): n is GameNode => isGameNode(n) && n.parentId === stage.id
          ).sort((a, b) => {
            // Sort by standing to ensure correct order
            const aStanding = parseInt(a.data.standing) || 0;
            const bStanding = parseInt(b.data.standing) || 0;
            return aStanding - bStanding;
          });

          if (games.length > 0) {
            const timeUpdates = recalculateStageGameTimes(stage, games);

            // Apply time updates to games (respecting manual overrides)
            return updatedNodes.map((node) => {
              const update = timeUpdates.find((u) => u.gameId === node.id);
              if (update && isGameNode(node) && !node.data.manualTime) {
                return {
                  ...node,
                  data: { ...node.data, startTime: update.startTime },
                };
              }
              return node;
            });
          }
        }

        // Case 2: Game break or duration changed - recalculate subsequent games in the same stage
        if (updatedNode && isGameNode(updatedNode) && ('breakAfter' in data || 'duration' in data)) {
          const game = updatedNode;
          const stageId = game.parentId;

          if (stageId) {
            const stage = updatedNodes.find((n): n is StageNode => n.id === stageId && isStageNode(n));

            if (stage && stage.data.startTime) {
              const games = updatedNodes.filter(
                (n): n is GameNode => isGameNode(n) && n.parentId === stageId
              ).sort((a, b) => {
                const aStanding = parseInt(a.data.standing) || 0;
                const bStanding = parseInt(b.data.standing) || 0;
                return aStanding - bStanding;
              });

              if (games.length > 0) {
                const timeUpdates = recalculateStageGameTimes(stage, games);

                // Apply time updates to games (respecting manual overrides)
                return updatedNodes.map((node) => {
                  const update = timeUpdates.find((u) => u.gameId === node.id);
                  if (update && isGameNode(node) && !node.data.manualTime) {
                    return {
                      ...node,
                      data: { ...node.data, startTime: update.startTime },
                    };
                  }
                  return node;
                });
              }
            }
          }
        }

        return updatedNodes;
      });
    },
    []
  );

  /**
   * Delete a node and its connected edges.
   * For container nodes (field, stage), cascade deletes all children.
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      // Find the node to determine if it's a container
      const nodeToDelete = nodes.find((n) => n.id === nodeId);

      // Collect all node IDs to delete (cascade for containers)
      const nodeIdsToDelete = new Set<string>([nodeId]);

      if (nodeToDelete) {
        if (isFieldNode(nodeToDelete)) {
          // Delete all stages in this field
          const stages = nodes.filter(
            (n) => isStageNode(n) && n.parentId === nodeId
          );
          stages.forEach((stage) => {
            nodeIdsToDelete.add(stage.id);
            // Delete all games/teams in each stage
            nodes
              .filter((n) => n.parentId === stage.id)
              .forEach((child) => nodeIdsToDelete.add(child.id));
          });
        } else if (isStageNode(nodeToDelete)) {
          // Delete all games/teams in this stage
          nodes
            .filter((n) => n.parentId === nodeId)
            .forEach((child) => nodeIdsToDelete.add(child.id));
        }
      }

      // Remove all nodes in the delete set
      setNodes((nds) => nds.filter((n) => !nodeIdsToDelete.has(n.id)));

      // Remove edges connected to any deleted node
      setEdges((eds) =>
        eds.filter(
          (e) => !nodeIdsToDelete.has(e.source) && !nodeIdsToDelete.has(e.target)
        )
      );

      // Update selection
      setSelection((sel) => ({
        nodeIds: sel.nodeIds.filter((id) => !nodeIdsToDelete.has(id)),
        edgeIds: sel.edgeIds,
      }));
    },
    [nodes, setNodes, setEdges]
  );

  // ============================================================================
  // Container Node Actions (v2)
  // ============================================================================

  /**
   * Add a new field container node.
   */
  const addFieldNode = useCallback(
    (options?: AddFieldOptions, includeStage: boolean = false): FieldNode => {
      const id = `field-${uuidv4()}`;

      // Count existing fields to generate default name
      const fieldCount = nodes.filter(isFieldNode).length;
      const name = options?.name ?? `Feld ${fieldCount + 1}`;

      // Calculate position (stack fields horizontally)
      const existingFields = nodes.filter(isFieldNode);
      const position = {
        x: 50 + existingFields.length * 400,
        y: 50,
      };

      const newField = createFieldNode(id, { name, order: fieldCount, color: options?.color }, position);

      if (includeStage) {
        // Create a default stage inside the field
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, id, { name: 'Vorrunde', stageType: 'vorrunde', order: 0 });
        setNodes((nds) => [...nds, newField, newStage]);
      } else {
        setNodes((nds) => [...nds, newField]);
      }

      return newField;
    },
    [nodes, setNodes]
  );

  /**
   * Add a new stage container inside a field.
   */
  const addStageNode = useCallback(
    (fieldId: string, options?: AddStageOptions): StageNode | null => {
      // Verify the field exists
      const field = nodes.find((n) => n.id === fieldId && isFieldNode(n));
      if (!field) {
        return null;
      }

      const id = `stage-${uuidv4()}`;

      // Count existing stages in this field to determine defaults
      const existingStages = nodes.filter(
        (n) => isStageNode(n) && n.parentId === fieldId
      );
      const stageCount = existingStages.length;

      // Default name based on stage count
      let defaultName = 'Vorrunde';
      let defaultType: StageType = 'vorrunde';
      if (stageCount === 1) {
        defaultName = 'Finalrunde';
        defaultType = 'finalrunde';
      } else if (stageCount > 1) {
        defaultName = `Stage ${stageCount + 1}`;
        defaultType = 'custom';
      }

      const name = options?.name ?? defaultName;
      const stageType = options?.stageType ?? defaultType;

      // Position relative to field, stacking vertically
      const position = {
        x: 20,
        y: 60 + stageCount * 180,
      };

      const newStage = createStageNode(id, fieldId, { name, stageType, order: stageCount }, position);

      setNodes((nds) => [...nds, newStage]);

      return newStage;
    },
    [nodes, setNodes]
  );

  /**
   * Add a new game node inside a stage.
   * If stageId is not provided, auto-creates field and stage.
   */
  const addGameNodeInStageAction = useCallback(
    (stageId?: string, options?: Partial<Omit<GameNodeData, 'type'>>): GameNode => {
      let targetStageId = stageId;

      // If no stage provided, find or create one
      if (!targetStageId) {
        // Find first field
        let field = nodes.find(isFieldNode);

        // If no field, create one
        if (!field) {
          const fieldId = `field-${uuidv4()}`;
          const fieldCount = nodes.filter(isFieldNode).length;
          field = createFieldNode(fieldId, { name: `Feld ${fieldCount + 1}`, order: fieldCount });
        }

        // Find first stage in the field
        let stage = nodes.find((n) => isStageNode(n) && n.parentId === field!.id);

        // If no stage, create one
        if (!stage) {
          const stageIdNew = `stage-${uuidv4()}`;
          stage = createStageNode(stageIdNew, field.id, { name: 'Vorrunde', stageType: 'vorrunde', order: 0 });

          // Add both field (if new) and stage
          if (!nodes.find((n) => n.id === field!.id)) {
            setNodes((nds) => [...nds, field, stage]);
          } else {
            setNodes((nds) => [...nds, stage]);
          }
        } else if (!nodes.find((n) => n.id === field!.id)) {
          // Add new field
          setNodes((nds) => [...nds, field]);
        }

        targetStageId = stage.id;
      }

      const id = `game-${uuidv4()}`;

      // Count games to generate standing
      const gameCount = nodes.filter(isGameNode).length;
      const standing = options?.standing ?? `Game ${gameCount + 1}`;

      // Position relative to stage, stacking vertically
      const gamesInStage = nodes.filter(
        (n) => isGameNode(n) && n.parentId === targetStageId
      );
      const position = {
        x: 30,
        y: 50 + gamesInStage.length * 120,
      };

      const newGame = createGameNodeInStage(id, targetStageId!, { ...options, standing }, position);

      setNodes((nds) => [...nds, newGame]);

      return newGame;
    },
    [nodes, setNodes]
  );

  /**
   * Add multiple games at once (bulk operation).
   * Games are sorted by standing before adding.
   * Triggers time recalculation for affected stages.
   */
  const addBulkGames = useCallback(
    (games: GameNode[]): void => {
      if (games.length === 0) return;

      // Sort games by standing to maintain consistent order
      const sortedGames = [...games].sort((a, b) => {
        const aStanding = a.data.standing || '';
        const bStanding = b.data.standing || '';
        return aStanding.localeCompare(bStanding);
      });

      // Add all games at once
      setNodes((prevNodes) => {
        const newNodes = [...prevNodes, ...sortedGames];

        // Recalculate times for all affected stages
        const affectedStageIds = new Set(sortedGames.map(g => g.parentId).filter(Boolean));

        if (affectedStageIds.size === 0) return newNodes;

        // For each affected stage, recalculate game times
        const updatedNodes = newNodes.map((node) => {
          // If this is a game in an affected stage and doesn't have manual time, recalculate
          if (isGameNode(node) && node.parentId && affectedStageIds.has(node.parentId) && !node.data.manualTime) {
            const stage = newNodes.find((n): n is StageNode => n.id === node.parentId && isStageNode(n));
            if (!stage || !stage.data.startTime) return node;

            // Get all games in this stage
            const stageGames = newNodes.filter(
              (n): n is GameNode => isGameNode(n) && n.parentId === stage.id
            );

            // Recalculate times for this stage
            const timeUpdates = recalculateStageGameTimes(stage, stageGames);
            const timeUpdate = timeUpdates.find(u => u.gameId === node.id);

            if (timeUpdate) {
              return {
                ...node,
                data: { ...node.data, startTime: timeUpdate.startTime }
              };
            }
          }
          return node;
        });

        return updatedNodes;
      });
    },
    [setNodes]
  );

  /**
   * Add a complete tournament structure (fields, stages, games, edges).
   * Used by the tournament generator to create tournaments atomically.
   */
  const addBulkTournament = useCallback(
    (structure: TournamentStructure): void => {
      setNodes((prevNodes) => [
        ...prevNodes,
        ...structure.fields,
        ...structure.stages,
        ...structure.games,
      ]);
      setEdges((prevEdges) => [...prevEdges, ...structure.edges]);
    },
    [setNodes, setEdges]
  );

  // ============================================================================
  // Container Query Functions (v2)
  // ============================================================================

  /**
   * Get the parent field of a game node.
   */
  const getGameField = useCallback(
    (gameId: string): FieldNode | null => {
      const game = nodes.find((n) => n.id === gameId && isGameNode(n));
      if (!game || !game.parentId) return null;

      // Game's parent is a stage
      const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
      if (!stage || !stage.parentId) return null;

      // Stage's parent is a field
      const field = nodes.find((n) => n.id === stage.parentId && isFieldNode(n));
      return field as FieldNode | null;
    },
    [nodes]
  );

  /**
   * Get the parent stage of a game node.
   */
  const getGameStage = useCallback(
    (gameId: string): StageNode | null => {
      const game = nodes.find((n) => n.id === gameId && isGameNode(n));
      if (!game || !game.parentId) return null;

      const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
      return stage as StageNode | null;
    },
    [nodes]
  );

  /**
   * Get all stages in a field.
   */
  const getFieldStages = useCallback(
    (fieldId: string): StageNode[] => {
      return nodes.filter(
        (n) => isStageNode(n) && n.parentId === fieldId
      ) as StageNode[];
    },
    [nodes]
  );

  /**
   * Get all games in a stage.
   */
  const getStageGames = useCallback(
    (stageId: string): GameNode[] => {
      return nodes.filter(
        (n) => isGameNode(n) && n.parentId === stageId
      ) as GameNode[];
    },
    [nodes]
  );

  /**
   * Selected container field (if a field is selected).
   */
  const selectedContainerField = useMemo(() => {
    if (!selectedNode) return null;
    if (isFieldNode(selectedNode)) return selectedNode as FieldNode;
    return null;
  }, [selectedNode]);

  /**
   * Selected container stage (if a stage is selected).
   */
  const selectedContainerStage = useMemo(() => {
    if (!selectedNode) return null;
    if (isStageNode(selectedNode)) return selectedNode as StageNode;
    return null;
  }, [selectedNode]);

  /**
   * Get the parent stage of a team node.
   */
  const getTeamStage = useCallback(
    (teamId: string): StageNode | null => {
      const team = nodes.find((n) => n.id === teamId && isTeamNode(n));
      if (!team || !team.parentId) return null;

      const stage = nodes.find((n) => n.id === team.parentId && isStageNode(n));
      return stage as StageNode | null;
    },
    [nodes]
  );

  /**
   * Get the parent field of a team node.
   */
  const getTeamField = useCallback(
    (teamId: string): FieldNode | null => {
      const team = nodes.find((n) => n.id === teamId && isTeamNode(n));
      if (!team || !team.parentId) return null;

      // Team's parent is a stage
      const stage = nodes.find((n) => n.id === team.parentId && isStageNode(n));
      if (!stage || !stage.parentId) return null;

      // Stage's parent is a field
      const field = nodes.find((n) => n.id === stage.parentId && isFieldNode(n));
      return field as FieldNode | null;
    },
    [nodes]
  );

  /**
   * Get the target stage for adding new nodes.
   * Priority:
   * 1. Selected stage
   * 2. Parent stage of selected team/game
   * 3. First stage of selected field
   * 4. First stage of first field (if exists)
   * 5. null (no containers exist)
   */
  const getTargetStage = useCallback((): StageNode | null => {
    // 1. If a stage is selected, use it
    if (selectedNode && isStageNode(selectedNode)) {
      return selectedNode as StageNode;
    }

    // 2. If a team or game inside a stage is selected, use its parent stage
    if (selectedNode && (isTeamNode(selectedNode) || isGameNode(selectedNode))) {
      if (selectedNode.parentId) {
        const parentStage = nodes.find(
          (n) => n.id === selectedNode.parentId && isStageNode(n)
        );
        if (parentStage) {
          return parentStage as StageNode;
        }
      }
    }

    // 3. If a field is selected, use its first stage
    if (selectedNode && isFieldNode(selectedNode)) {
      const stages = nodes.filter(
        (n) => isStageNode(n) && n.parentId === selectedNode.id
      ) as StageNode[];
      if (stages.length > 0) {
        return stages[0];
      }
    }

    // 4. Find first field and its first stage
    const allFields = nodes.filter(isFieldNode) as FieldNode[];
    if (allFields.length > 0) {
      const firstField = allFields[0];
      const stages = nodes.filter(
        (n) => isStageNode(n) && n.parentId === firstField.id
      ) as StageNode[];
      if (stages.length > 0) {
        return stages[0];
      }
    }

    // 5. No containers exist
    return null;
  }, [nodes, selectedNode]);

  /**
   * Ensure container hierarchy exists, creating if needed.
   * Returns the field and stage IDs (either existing or newly created).
   */
  const ensureContainerHierarchy = useCallback((): { fieldId: string; stageId: string } => {
    // Priority 1: Check for selected field that needs a stage
    // This must come BEFORE getTargetStage() because getTargetStage falls through
    // to return stages from other fields, but we want to create in the selected field
    if (selectedNode && isFieldNode(selectedNode)) {
      const fieldId = selectedNode.id;
      // Check if selected field already has stages
      const existingStages = nodes.filter(
        (n) => isStageNode(n) && n.parentId === fieldId
      );
      if (existingStages.length === 0) {
        // Create a stage in the selected field
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, fieldId, { name: 'Vorrunde', stageType: 'vorrunde', order: 0 });
        setNodes((nds) => [...nds, newStage]);
        return { fieldId, stageId };
      }
      // Field has stages, return the first one
      return { fieldId, stageId: existingStages[0].id };
    }

    // Priority 2: Check if we already have a target stage via selection
    const existingTarget = getTargetStage();
    if (existingTarget && existingTarget.parentId) {
      return {
        fieldId: existingTarget.parentId,
        stageId: existingTarget.id,
      };
    }

    // Priority 3: Check if there's a field without stages
    const allFields = nodes.filter(isFieldNode) as FieldNode[];
    if (allFields.length > 0) {
      const firstField = allFields[0];
      const existingStages = nodes.filter(
        (n) => isStageNode(n) && n.parentId === firstField.id
      );
      if (existingStages.length === 0) {
        // Create a stage in the first field
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, firstField.id, { name: 'Vorrunde', stageType: 'vorrunde', order: 0 });
        setNodes((nds) => [...nds, newStage]);
        return { fieldId: firstField.id, stageId };
      }
    }

    // Priority 4: Need to create both field and stage
    const fieldId = `field-${uuidv4()}`;
    const stageId = `stage-${uuidv4()}`;
    const fieldCount = nodes.filter(isFieldNode).length;

    const newField = createFieldNode(fieldId, { name: `Feld ${fieldCount + 1}`, order: fieldCount });
    const newStage = createStageNode(stageId, fieldId, { name: 'Vorrunde', stageType: 'vorrunde', order: 0 });

    setNodes((nds) => [
      ...nds,
      newField,
      newStage,
    ]);

    return { fieldId, stageId };
  }, [nodes, selectedNode, getTargetStage, setNodes]);

  // addTeamNodeInStage removed - teams are now managed in global team pool (v2)

  /**
   * Move a node to a different stage.
   */
  const moveNodeToStage = useCallback(
    (nodeId: string, targetStageId: string) => {
      // Verify target stage exists
      const targetStage = nodes.find((n) => n.id === targetStageId && isStageNode(n));
      if (!targetStage) return;

      // Find the node
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Only allow moving teams and games
      if (!isTeamNode(node) && !isGameNode(node)) return;

      // Calculate new position based on existing nodes in target stage
      const nodesInTargetStage = nodes.filter(
        (n) =>
          (isTeamNode(n) || isGameNode(n)) &&
          n.parentId === targetStageId &&
          n.id !== nodeId
      );

      // Position based on node type
      let newPosition: { x: number; y: number };
      if (isTeamNode(node)) {
        const teamsInStage = nodesInTargetStage.filter(isTeamNode);
        newPosition = {
          x: 20,
          y: 40 + teamsInStage.length * 60,
        };
      } else {
        const gamesInStage = nodesInTargetStage.filter(isGameNode);
        newPosition = {
          x: 150,
          y: 40 + gamesInStage.length * 100,
        };
      }

      // Update the node
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              parentId: targetStageId,
              position: newPosition,
              extent: 'parent' as const,
            };
          }
          return n;
        })
      );
    },
    [nodes, setNodes]
  );

  // ============================================================================
  // Edge actions
  // ============================================================================

  /**
   * Add multiple GameToGameEdges at once (bulk operation).
   * More efficient than individual addGameToGameEdge calls when creating many edges.
   * Ensures all edges are added in a single state update, preventing React batching issues.
   *
   * @param edgesToAdd - Array of edge specifications
   * @returns Array of created edge IDs
   */
  const addBulkGameToGameEdges = useCallback(
    (edgesToAdd: Array<{
      sourceGameId: string;
      outputType: 'winner' | 'loser';
      targetGameId: string;
      targetSlot: 'home' | 'away';
    }>): string[] => {
      if (edgesToAdd.length === 0) return [];

      const newEdges = edgesToAdd.map(({ sourceGameId, outputType, targetGameId, targetSlot }) => {
        const edgeId = `edge-${uuidv4()}`;
        return createGameToGameEdge(edgeId, sourceGameId, outputType, targetGameId, targetSlot);
      });

      console.log('[addBulkGameToGameEdges] Creating', newEdges.length, 'edges in bulk');

      // Add all edges in a single state update
      setEdges((eds) => {
        console.log('[addBulkGameToGameEdges] Current edges count:', eds.length);
        const updatedEdges = [...eds, ...newEdges];
        console.log('[addBulkGameToGameEdges] New edges count:', updatedEdges.length);
        return updatedEdges;
      });

      // Clear static team assignments for all affected slots
      const teamClearUpdates = new Map<string, Partial<GameNodeData>>();
      edgesToAdd.forEach(({ targetGameId, targetSlot }) => {
        const existing = teamClearUpdates.get(targetGameId) || {};
        teamClearUpdates.set(targetGameId, {
          ...existing,
          [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
        });
      });

      // Apply all team clear updates
      teamClearUpdates.forEach((updates, gameId) => {
        console.log('[addBulkGameToGameEdges] Clearing static teams for', gameId, updates);
        updateNode(gameId, updates);
      });

      return newEdges.map(e => e.id);
    },
    [setEdges, updateNode]
  );

  /**
   * Add a GameToGameEdge from source game to target game.
   * Creates a dynamic team reference (winner/loser) connection.
   *
   * @param sourceGameId - ID of the source game providing the team
   * @param outputType - Whether to use the winner or loser of the source game
   * @param targetGameId - ID of the target game receiving the team
   * @param targetSlot - Which slot on the target game ('home' or 'away')
   * @returns The ID of the created edge
   */
  const addGameToGameEdge = useCallback(
    (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away'): string => {
      const edgeId = `edge-${uuidv4()}`;
      const newEdge = createGameToGameEdge(
        edgeId,
        sourceGameId,
        outputType,
        targetGameId,
        targetSlot
      );

      console.log('[addGameToGameEdge] Creating edge:', { edgeId, sourceGameId, outputType, targetGameId, targetSlot });
      setEdges((eds) => {
        console.log('[addGameToGameEdge] Current edges count:', eds.length);
        const newEdges = [...eds, newEdge];
        console.log('[addGameToGameEdge] New edges count:', newEdges.length);
        return newEdges;
      });

      // Clear static team assignment for this slot
      console.log('[addGameToGameEdge] Clearing static team assignment for', targetGameId, targetSlot);
      updateNode(targetGameId, {
        [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
      });

      return edgeId;
    },
    [setEdges, updateNode]
  );

  /**
   * Remove a GameToGameEdge targeting a specific game slot.
   * Clears the dynamic team reference for the specified slot.
   *
   * @param targetGameId - ID of the target game
   * @param targetSlot - Which slot to clear ('home' or 'away')
   */
  const removeGameToGameEdge = useCallback(
    (targetGameId: string, targetSlot: 'home' | 'away'): void => {
      setEdges((eds) => eds.filter((e) =>
        !(e.target === targetGameId && e.targetHandle === targetSlot)
      ));
    },
    [setEdges]
  );

  /**
   * Delete an edge.
   */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));

      // Update selection
      setSelection((sel) => ({
        nodeIds: sel.nodeIds,
        edgeIds: sel.edgeIds.filter((id) => id !== edgeId),
      }));
    },
    [setEdges]
  );

  // ============================================================================
  // Field actions
  // ============================================================================

  /**
   * Add a new field.
   */
  const addField = useCallback(
    (name: string): FlowField => {
      const id = `field-${uuidv4()}`;
      const order = fields.length;

      const newField = createFlowField(id, name, order);

      setFields((flds) => [...flds, newField]);

      return newField;
    },
    [fields]
  );

  /**
   * Update a field's name.
   */
  const updateField = useCallback((fieldId: string, name: string) => {
    setFields((flds) =>
      flds.map((f) => (f.id === fieldId ? { ...f, name } : f))
    );
  }, []);

  /**
   * Delete a field and unassign games from it.
   */
  const deleteField = useCallback(
    (fieldId: string) => {
      // Remove the field
      setFields((flds) => flds.filter((f) => f.id !== fieldId));

      // Unassign games from this field
      setNodes((nds) =>
        nds.map((node) => {
          if (isGameNode(node as FlowNode) && (node.data as GameNodeData).fieldId === fieldId) {
            return {
              ...node,
              data: { ...node.data, fieldId: null },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // ============================================================================
  // Selection actions
  // ============================================================================

  /**
   * Select a single node by ID.
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setSelection({
      nodeIds: nodeId ? [nodeId] : [],
      edgeIds: [],
    });
  }, []);

  // ============================================================================
  // Global team pool actions (v2)
  // ============================================================================

  /**
   * Add a new global team to the pool.
   */
  const addGlobalTeam = useCallback(
    (label?: string, groupId?: string | null): GlobalTeam => {
      const id = `team-${uuidv4()}`;
      const order = globalTeams.length;

      const newTeam: GlobalTeam = {
        id,
        label: label ?? `Team ${order + 1}`,
        groupId: groupId ?? null,
        order,
      };

      setGlobalTeams((teams) => [...teams, newTeam]);
      return newTeam;
    },
    [globalTeams]
  );

  /**
   * Update a global team's data.
   */
  const updateGlobalTeam = useCallback(
    (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => {
      setGlobalTeams((teams) =>
        teams.map((t) => (t.id === teamId ? { ...t, ...data } : t))
      );
    },
    []
  );

  /**
   * Delete a global team from the pool.
   * Automatically unassigns the team from any games it's assigned to.
   */
  const deleteGlobalTeam = useCallback(
    (teamId: string) => {
      // Check if team is used by any games
      const usages: { gameId: string; slot: 'home' | 'away' }[] = [];
      nodes.filter(isGameNode).forEach((game) => {
        const data = game.data as GameNodeData;
        if (data.homeTeamId === teamId) usages.push({ gameId: game.id, slot: 'home' });
        if (data.awayTeamId === teamId) usages.push({ gameId: game.id, slot: 'away' });
      });

      if (usages.length > 0) {
        // Unassign from all games
        setNodes((nds) =>
          nds.map((n) => {
            if (!isGameNode(n)) return n;
            const data = n.data as GameNodeData;
            return {
              ...n,
              data: {
                ...data,
                homeTeamId: data.homeTeamId === teamId ? null : data.homeTeamId,
                awayTeamId: data.awayTeamId === teamId ? null : data.awayTeamId,
              },
            };
          })
        );
      }

      setGlobalTeams((teams) => teams.filter((t) => t.id !== teamId));
    },
    [nodes]
  );

  /**
   * Reorder a global team (move up or down in the list).
   */
  const reorderGlobalTeam = useCallback(
    (teamId: string, direction: 'up' | 'down') => {
      setGlobalTeams((teams) => {
        const sorted = [...teams].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((t) => t.id === teamId);

        if (index === -1) return teams;

        if (direction === 'up' && index > 0) {
          [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
        } else if (direction === 'down' && index < sorted.length - 1) {
          [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
        }

        return sorted.map((t, i) => ({ ...t, order: i }));
      });
    },
    []
  );

  // ======================================================================
  // Global Team Groups (v2)
  // ======================================================================

  /**
   * Add a new global team group.
   */
  const addGlobalTeamGroup = useCallback(
    (name?: string): GlobalTeamGroup => {
      const id = `group-${uuidv4()}`;
      const order = globalTeamGroups.length;

      const newGroup: GlobalTeamGroup = {
        id,
        name: name ?? `Group ${order + 1}`,
        order,
      };

      setGlobalTeamGroups((groups) => [...groups, newGroup]);
      return newGroup;
    },
    [globalTeamGroups]
  );

  /**
   * Update a global team group.
   */
  const updateGlobalTeamGroup = useCallback(
    (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => {
      setGlobalTeamGroups((groups) =>
        groups.map((g) => (g.id === groupId ? { ...g, ...data } : g))
      );
    },
    []
  );

  /**
   * Delete a global team group.
   * All teams in the group will be deleted (cascading delete).
   */
  const deleteGlobalTeamGroup = useCallback(
    (groupId: string) => {
      const teamsInGroup = globalTeams.filter((t) => t.groupId === groupId);

      if (teamsInGroup.length > 0) {
        // Delete all teams in this group
        const teamIdsToDelete = new Set(teamsInGroup.map(t => t.id));

        // Unassign teams from games
        setNodes((nds) =>
          nds.map((n) => {
            if (!isGameNode(n)) return n;
            const data = n.data as GameNodeData;
            return {
              ...n,
              data: {
                ...data,
                homeTeamId: data.homeTeamId && teamIdsToDelete.has(data.homeTeamId) ? null : data.homeTeamId,
                awayTeamId: data.awayTeamId && teamIdsToDelete.has(data.awayTeamId) ? null : data.awayTeamId,
              },
            };
          })
        );

        // Remove teams from global teams
        setGlobalTeams((teams) => teams.filter((t) => !teamIdsToDelete.has(t.id)));
      }

      setGlobalTeamGroups((groups) => groups.filter((g) => g.id !== groupId));
    },
    [globalTeams]
  );

  /**
   * Reorder a global team group (move up or down).
   */
  const reorderGlobalTeamGroup = useCallback(
    (groupId: string, direction: 'up' | 'down') => {
      setGlobalTeamGroups((groups) => {
        const sorted = [...groups].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((g) => g.id === groupId);

        if (index === -1) return groups;

        if (direction === 'up' && index > 0) {
          [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
        } else if (direction === 'down' && index < sorted.length - 1) {
          [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
        }

        return sorted.map((g, i) => ({ ...g, order: i }));
      });
    },
    []
  );

  /**
   * Assign a global team to a game slot (home or away).
   */
  const assignTeamToGame = useCallback(
    (gameId: string, teamId: string, slot: 'home' | 'away') => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== gameId || !isGameNode(n)) return n;

          return {
            ...n,
            data: {
              ...n.data,
              [slot === 'home' ? 'homeTeamId' : 'awayTeamId']: teamId,
            },
          };
        })
      );
    },
    []
  );

  /**
   * Unassign a team from a game slot.
   */
  const unassignTeamFromGame = useCallback(
    (gameId: string, slot: 'home' | 'away') => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== gameId || !isGameNode(n)) return n;

          return {
            ...n,
            data: {
              ...n.data,
              [slot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
            },
          };
        })
      );
    },
    []
  );

  /**
   * Get all games that use a specific global team.
   */
  const getTeamUsage = useCallback(
    (teamId: string): { gameId: string; slot: 'home' | 'away' }[] => {
      const usages: { gameId: string; slot: 'home' | 'away' }[] = [];

      nodes.filter(isGameNode).forEach((game) => {
        const data = game.data as GameNodeData;
        if (data.homeTeamId === teamId) usages.push({ gameId: game.id, slot: 'home' });
        if (data.awayTeamId === teamId) usages.push({ gameId: game.id, slot: 'away' });
      });

      return usages;
    },
    [nodes]
  );

  // ============================================================================
  // Bulk actions
  // ============================================================================

  /**
   * Clear all nodes, edges, teams, groups, and optionally fields.
   */
  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setGlobalTeams([]);
    setGlobalTeamGroups([]);
    setSelection({ nodeIds: [], edgeIds: [] });
    // Keep fields by default
  }, [setNodes, setEdges]);

  /**
   * Import a complete flow state.
   */
  const importState = useCallback(
    (state: FlowState) => {
      setNodes(state.nodes);
      setEdges(state.edges);
      setFields(state.fields);

      // MIGRATION: Convert old format (with reference) to new format (with groupId)
      const migratedTeams = (state.globalTeams || []).map((team: any) => {
        if ('reference' in team && !('groupId' in team)) {
          // Old format - convert to new format
          return {
            id: team.id,
            label: team.label || 'Team',
            groupId: null,
            order: team.order,
          };
        }
        // Already new format
        return team;
      });

      setGlobalTeams(migratedTeams);
      setGlobalTeamGroups(state.globalTeamGroups || []);
      setSelection({ nodeIds: [], edgeIds: [] });
    },
    []
  );

  /**
   * Export the current flow state.
   */
  const exportState = useCallback((): FlowState => {
    return {
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
      fields,
      globalTeams,
      globalTeamGroups,
    };
  }, [nodes, edges, fields, globalTeams, globalTeamGroups]);

  return {
    // State
    nodes,
    edges,
    fields,
    selectedNode,
    selection,

    // Callbacks (for compatibility)
    onNodesChange,
    onEdgesChange,

    // Node actions
    addGameNode,
    updateNode,
    deleteNode,

    // Container node actions (v2)
    addFieldNode,
    addStageNode,
    addGameNodeInStage: addGameNodeInStageAction,
    addBulkGames,
    addBulkTournament,

    // Container hierarchy helpers (v2)
    getTargetStage,
    ensureContainerHierarchy,
    moveNodeToStage,

    // Container queries (v2)
    getGameField,
    getGameStage,
    getTeamField,
    getTeamStage,
    getFieldStages,
    getStageGames,
    selectedContainerField,
    selectedContainerStage,

    // Edge actions
    setEdges,
    deleteEdge,
    addGameToGameEdge,
    addBulkGameToGameEdges,
    removeGameToGameEdge,

    // Field actions (legacy)
    addField,
    updateField,
    deleteField,

    // Selection actions
    setSelection,
    selectNode,

    // Global team pool actions (v2)
    globalTeams,
    addGlobalTeam,
    updateGlobalTeam,
    deleteGlobalTeam,
    reorderGlobalTeam,

    // Global team group actions (v2)
    globalTeamGroups,
    addGlobalTeamGroup,
    updateGlobalTeamGroup,
    deleteGlobalTeamGroup,
    reorderGlobalTeamGroup,

    // Team assignment actions (v2)
    assignTeamToGame,
    unassignTeamFromGame,
    getTeamUsage,

    // Bulk actions
    clearAll,
    importState,
    exportState,

    // Derived data
    matchNames,
    groupNames,
  };
}
