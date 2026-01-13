/**
 * useNodesState Hook
 *
 * Specialized hook for managing node-related state and operations:
 * - Node CRUD (add, update, delete)
 * - Container hierarchy (fields, stages, games)
 * - Hierarchy queries
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  FieldNode,
  StageNode,
  GameNode,
  GameNodeData,
  TeamNodeData,
  FieldNodeData,
  StageNodeData,
  StageType,
  TournamentStructure,
} from '../types/flowchart';
import {
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
  isGameNode,
  isFieldNode,
  isStageNode,
} from '../types/flowchart';
import { recalculateStageGameTimes } from '../utils/timeCalculation';

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
  category?: StageCategory;
  stageType?: StageType;
}

export function useNodesState(
  nodes: FlowNode[],
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>,
  onNodesDeleted?: (nodeIds: string[]) => void
) {
  /**
   * Add a new field container node.
   */
  const addFieldNode = useCallback(
    (options?: AddFieldOptions, includeStage: boolean = false): FieldNode => {
      const id = `field-${uuidv4()}`;
      const fieldCount = nodes.filter(isFieldNode).length;
      const name = options?.name ?? `Feld ${fieldCount + 1}`;
      const position = { x: 50 + fieldCount * 400, y: 50 };

      const newField = createFieldNode(id, { name, order: fieldCount, color: options?.color }, position);

      if (includeStage) {
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, id, { name: 'Preliminary', category: 'preliminary', stageType: 'STANDARD', order: 0 });
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
      const field = nodes.find((n) => n.id === fieldId && isFieldNode(n));
      if (!field) return null;

      const id = `stage-${uuidv4()}`;
      const existingStages = nodes.filter((n) => isStageNode(n) && n.parentId === fieldId);
      const stageCount = existingStages.length;

      let defaultName = 'Preliminary';
      let defaultCategory: StageCategory = 'preliminary';
      if (stageCount === 1) {
        defaultName = 'Final';
        defaultCategory = 'final';
      } else if (stageCount > 1) {
        defaultName = `Stage ${stageCount + 1}`;
        defaultCategory = 'custom';
      }

      const name = options?.name ?? defaultName;
      const category = options?.category ?? defaultCategory;
      const stageType = options?.stageType ?? 'STANDARD';
      const position = { x: 20, y: 60 + stageCount * 180 };

      const newStage = createStageNode(id, fieldId, { name, category, stageType, order: stageCount }, position);
      setNodes((nds) => [...nds, newStage]);

      return newStage;
    },
    [nodes, setNodes]
  );

  /**
   * Helper to get target stage based on current selection.
   */
  const getTargetStage = useCallback(
    (selectedNodeId: string | null): StageNode | null => {
      if (!selectedNodeId) {
        const firstField = nodes.find(isFieldNode);
        if (firstField) return (nodes.find((n) => isStageNode(n) && n.parentId === firstField.id) as StageNode) || null;
        return null;
      }

      const selected = nodes.find((n) => n.id === selectedNodeId);
      if (!selected) return null;

      if (isStageNode(selected)) return selected;
      if (isGameNode(selected) && selected.parentId) {
        return (nodes.find((n) => n.id === selected.parentId && isStageNode(n)) as StageNode) || null;
      }

      if (isFieldNode(selected)) {
        const stages = nodes.filter((n) => isStageNode(n) && n.parentId === selected.id) as StageNode[];
        if (stages.length > 0) return stages[0];
      }

      return null;
    },
    [nodes]
  );

  /**
   * Ensure container hierarchy exists, creating if needed.
   * Returns the field and stage IDs (either existing or newly created).
   */
  const ensureContainerHierarchy = useCallback(
    (selectedNodeId: string | null): { fieldId: string; stageId: string } => {
      const target = getTargetStage(selectedNodeId);
      if (target && target.parentId) {
        return {
          fieldId: target.parentId,
          stageId: target.id,
        };
      }

      // Check for selected field that needs a stage
      const selected = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
      if (selected && isFieldNode(selected)) {
        const fieldId = selected.id;
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, fieldId, { name: 'Preliminary', category: 'preliminary', stageType: 'STANDARD', order: 0 });
        setNodes((nds) => [...nds, newStage]);
        return { fieldId, stageId };
      }

      // Check if there's a field without stages
      const allFields = nodes.filter(isFieldNode) as FieldNode[];
      if (allFields.length > 0) {
        const firstField = allFields[0];
        const existingStages = nodes.filter((n) => isStageNode(n) && n.parentId === firstField.id);
        if (existingStages.length > 0) {
          return { fieldId: firstField.id, stageId: existingStages[0].id };
        }
        // Create stage in existing field
        const stageId = `stage-${uuidv4()}`;
        const newStage = createStageNode(stageId, firstField.id, { name: 'Preliminary', category: 'preliminary', stageType: 'STANDARD', order: 0 });
        setNodes((nds) => [...nds, newStage]);
        return { fieldId: firstField.id, stageId };
      }

      // Need to create both field and stage
      const fieldId = `field-${uuidv4()}`;
      const stageId = `stage-${uuidv4()}`;
      const fieldCount = nodes.filter(isFieldNode).length;

      const newField = createFieldNode(fieldId, { name: `Feld ${fieldCount + 1}`, order: fieldCount });
      const newStage = createStageNode(stageId, fieldId, { name: 'Preliminary', category: 'preliminary', stageType: 'STANDARD', order: 0 });

      setNodes((nds) => [...nds, newField, newStage]);

      return { fieldId, stageId };
    },
    [nodes, setNodes, getTargetStage]
  );

  /**
   * Add a new game node inside a stage.
   * If stageId is not provided, find or create default stage.
   */
  const addGameNodeInStage = useCallback(
    (stageId?: string, options?: Partial<Omit<GameNodeData, 'type'>>): GameNode => {
      let targetStageId = stageId;
      let hierarchyCreated: { fieldId: string; stageId: string } | null = null;

      if (!targetStageId) {
        hierarchyCreated = ensureContainerHierarchy(null);
        targetStageId = hierarchyCreated.stageId;
      }

      const id = `game-${uuidv4()}`;
      // Note: We use nodes from closure here, which might be stale if hierarchy was just created.
      // However, we rely on setNodes being batched or sequential in tests.
      const gamesInStage = nodes.filter((n) => isGameNode(n) && n.parentId === targetStageId);
      const standing = options?.standing ?? `Game ${nodes.filter(isGameNode).length + 1}`;
      const position = { x: 30, y: 50 + gamesInStage.length * 120 };

      const newGame = createGameNodeInStage(id, targetStageId!, { ...options, standing }, position);
      
      if (hierarchyCreated) {
        // We already called setNodes in ensureContainerHierarchy, but we need to add the game too.
        // To avoid multiple state updates and race conditions, we should ideally do this in one go.
        // But for now, we'll just add the game.
        setNodes((nds) => [...nds, newGame]);
      } else {
        setNodes((nds) => [...nds, newGame]);
      }

      return newGame;
    },
    [nodes, setNodes, ensureContainerHierarchy]
  );

  /**
   * Update a node's data.
   */
  const updateNode = useCallback(
    (nodeId: string, data: Partial<TeamNodeData | GameNodeData | FieldNodeData | StageNodeData>) => {
      setNodes((prevNodes) => {
        const updatedNodes = prevNodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...data } };
          }
          return node;
        });

        const updatedNode = updatedNodes.find((n) => n.id === nodeId);

        // Time recalculation logic
        if (updatedNode && isStageNode(updatedNode) && 'startTime' in data) {
          const stage = updatedNode;
          const games = updatedNodes
            .filter((n): n is GameNode => isGameNode(n) && n.parentId === stage.id)
            .sort((a, b) => (parseInt(a.data.standing) || 0) - (parseInt(b.data.standing) || 0));

          if (games.length > 0) {
            const timeUpdates = recalculateStageGameTimes(stage, games);
            return updatedNodes.map((node) => {
              const update = timeUpdates.find((u) => u.gameId === node.id);
              if (update && isGameNode(node) && !node.data.manualTime) {
                return { ...node, data: { ...node.data, startTime: update.startTime } };
              }
              return node;
            });
          }
        }

        if (updatedNode && isGameNode(updatedNode) && ('breakAfter' in data || 'duration' in data || 'startTime' in data)) {
          const stageId = updatedNode.parentId;
          if (stageId) {
            const stage = updatedNodes.find((n): n is StageNode => n.id === stageId && isStageNode(n));
            if (stage && stage.data.startTime) {
              const games = updatedNodes
                .filter((n): n is GameNode => isGameNode(n) && n.parentId === stageId)
                .sort((a, b) => (parseInt(a.data.standing) || 0) - (parseInt(b.data.standing) || 0));

              if (games.length > 0) {
                const timeUpdates = recalculateStageGameTimes(stage, games);
                return updatedNodes.map((node) => {
                  const update = timeUpdates.find((u) => u.gameId === node.id);
                  if (update && isGameNode(node) && !node.data.manualTime) {
                    return { ...node, data: { ...node.data, startTime: update.startTime } };
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
    [setNodes]
  );

  /**
   * Delete a node and its children (cascade).
   */
  const deleteNode = useCallback(
    (nodeId: string, onEdgesDeleted?: (nodeIds: string[]) => void) => {
      // Find nodes to delete using current state to ensure accuracy
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      const nodeIdsToDelete = new Set<string>([nodeId]);

      if (nodeToDelete) {
        if (isFieldNode(nodeToDelete)) {
          const stages = nodes.filter((n) => isStageNode(n) && n.parentId === nodeId);
          stages.forEach((stage) => {
            nodeIdsToDelete.add(stage.id);
            nodes.filter((n) => n.parentId === stage.id).forEach((child) => nodeIdsToDelete.add(child.id));
          });
        } else if (isStageNode(nodeToDelete)) {
          nodes.filter((n) => n.parentId === nodeId).forEach((child) => nodeIdsToDelete.add(child.id));
        }
      }

      const deletedIds = Array.from(nodeIdsToDelete);
      setNodes((nds) => nds.filter((n) => !nodeIdsToDelete.has(n.id)));
      
      if (onNodesDeleted) {
        onNodesDeleted(deletedIds);
      }
      if (onEdgesDeleted) {
        onEdgesDeleted(deletedIds);
      }
    },
    [nodes, setNodes, onNodesDeleted]
  );

  /**
   * Add a complete tournament structure.
   */
  const addBulkTournament = useCallback(
    (structure: TournamentStructure): void => {
      setNodes((prevNodes) => [...prevNodes, ...structure.fields, ...structure.stages, ...structure.games]);
    },
    [setNodes]
  );

  const getGameField = useCallback(
    (gameId: string): FieldNode | null => {
      const game = nodes.find((n) => n.id === gameId && isGameNode(n));
      if (!game?.parentId) return null;
      const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
      if (!stage?.parentId) return null;
      const field = nodes.find((n) => n.id === stage.parentId && isFieldNode(n));
      return (field as FieldNode) || null;
    },
    [nodes]
  );

  const getGameStage = useCallback(
    (gameId: string): StageNode | null => {
      const game = nodes.find((n) => n.id === gameId && isGameNode(n));
      if (!game?.parentId) return null;
      const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
      return (stage as StageNode) || null;
    },
    [nodes]
  );

  return {
    addFieldNode,
    addStageNode,
    addGameNodeInStage,
    updateNode,
    deleteNode,
    addBulkTournament,
    ensureContainerHierarchy,
    getTargetStage,
    getGameField,
    getGameStage,
  };
}