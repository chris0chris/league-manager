import { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  FlowEdge,
  FlowField,
  FlowState,
  GameNodeData,
  FieldNode,
  StageNode,
  GameNode,
  SelectionState,
  GlobalTeam,
  GlobalTeamGroup,
} from '../types/flowchart';
import {
  createFlowField,
  createGameNode,
  isGameNode,
  isFieldNode,
  isStageNode,
} from '../types/flowchart';
import { useNodesState } from './useNodesState';
import { useEdgesState } from './useEdgesState';
import { useTeamPoolState } from './useTeamPoolState';

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
    nodeType === 'game' ? isGameNode(n) : false
  );

  return {
    x: baseX,
    y: baseY + sameTypeNodes.length * offsetY,
  };
}

/**
 * useFlowState hook.
 *
 * Orchestrates specialized hooks for managing the complete state of the flowchart designer.
 */
export function useFlowState(initialState?: Partial<FlowState>): UseFlowStateReturn {
  // --- Core State ---
  const [nodes, setNodes] = useState<FlowNode[]>(initialState?.nodes ?? []);
  const [edges, setEdges] = useState<FlowEdge[]>(initialState?.edges ?? []);
  const [fields, setFields] = useState<FlowField[]>(initialState?.fields ?? []);
  const [globalTeams, setGlobalTeams] = useState<GlobalTeam[]>(initialState?.globalTeams ?? []);
  const [globalTeamGroups, setGlobalTeamGroups] = useState<GlobalTeamGroup[]>(initialState?.globalTeamGroups ?? []);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeIds: [] });

  // --- Specialized Hooks ---
  const nodesManager = useNodesState(nodes, setNodes);
  const edgesManager = useEdgesState(edges, setEdges, setNodes);
  const teamPoolManager = useTeamPoolState(
    globalTeams,
    setGlobalTeams,
    globalTeamGroups,
    setGlobalTeamGroups,
    nodes,
    setNodes
  );

  // Sync nodes when standing names change (since dynamic references use match names)
  const standignsDependency = nodes.map(n => isGameNode(n) ? n.data.standing : '').join(',');
  useEffect(() => {
    edgesManager.syncNodesWithEdges(nodes, edges);
  }, [standignsDependency, edgesManager, nodes, edges]);

  // --- Actions ---

  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelection({ nodeIds: nodeId ? [nodeId] : [], edgeIds: [] });
  }, []);

  const addField = useCallback((name: string): FlowField => {
    const id = `field-${uuidv4()}`;
    const newField = createFlowField(id, name, fields.length);
    setFields((flds) => [...flds, newField]);
    return newField;
  }, [fields]);

  const updateField = useCallback((fieldId: string, name: string) => {
    setFields((flds) => flds.map((f) => (f.id === fieldId ? { ...f, name } : f)));
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setFields((flds) => flds.filter((f) => f.id !== fieldId));
    setNodes((nds) =>
      nds.map((node) => {
        if (isGameNode(node) && node.data.fieldId === fieldId) {
          return { ...node, data: { ...node.data, fieldId: null } };
        }
        return node;
      })
    );
  }, []);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setGlobalTeams([]);
    setGlobalTeamGroups([]);
    setSelection({ nodeIds: [], edgeIds: [] });
  }, []);

  const importState = useCallback((state: FlowState) => {
    setNodes(state.nodes);
    setEdges(state.edges);
    setFields(state.fields);
    const migratedTeams = (state.globalTeams || []).map((team: GlobalTeam & { reference?: string }) => {
      if ('reference' in team && !('groupId' in team)) {
        return { id: team.id, label: team.label || 'Team', groupId: null, order: team.order };
      }
      return team;
    });
    setGlobalTeams(migratedTeams);
    setGlobalTeamGroups(state.globalTeamGroups || []);
    setSelection({ nodeIds: [], edgeIds: [] });
  }, []);

  const exportState = useCallback((): FlowState => ({
    nodes,
    edges,
    fields,
    globalTeams,
    globalTeamGroups,
  }), [nodes, edges, fields, globalTeams, globalTeamGroups]);

  /**
   * Legacy addGameNode that doesn't enforce hierarchy.
   */
  const addGameNode = useCallback(
    (options?: Partial<Omit<GameNodeData, 'type'>>): FlowNode => {
      const id = `game-${uuidv4()}`;
      const position = calculateNewNodePosition(nodes, 'game');
      const gameCount = nodes.filter(isGameNode).length;
      const standing = options?.standing ?? `Game ${gameCount + 1}`;
      const newNode = createGameNode(id, position, { ...options, standing });
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [nodes, setNodes]
  );

  /**
   * Orchestrated deleteNode that handles cascading and edge cleanup.
   */
  const deleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return;

      const nodeIdsToDelete = new Set<string>([nodeId]);
      if (isFieldNode(nodeToDelete)) {
        const stages = nodes.filter((n) => isStageNode(n) && n.parentId === nodeId);
        stages.forEach((stage) => {
          nodeIdsToDelete.add(stage.id);
          nodes.filter((n) => n.parentId === stage.id).forEach((child) => nodeIdsToDelete.add(child.id));
        });
      } else if (isStageNode(nodeToDelete)) {
        nodes.filter((n) => n.parentId === nodeId).forEach((child) => nodeIdsToDelete.add(child.id));
      }

      const deletedIds = Array.from(nodeIdsToDelete);
      
      // Atomic updates
      setNodes((nds) => {
        const remainingNodes = nds.filter((n) => !nodeIdsToDelete.has(n.id));
        // Also cleanup lost dynamic refs in remaining nodes
        return remainingNodes.map(node => {
          if (!isGameNode(node)) return node;
          const lostHome = edges.some(e => e.target === node.id && e.targetHandle === 'home' && deletedIds.includes(e.source));
          const lostAway = edges.some(e => e.target === node.id && e.targetHandle === 'away' && deletedIds.includes(e.source));
          if (!lostHome && !lostAway) return node;
          return {
            ...node,
            data: {
              ...node.data,
              ...(lostHome ? { homeTeamDynamic: null } : {}),
              ...(lostAway ? { awayTeamDynamic: null } : {})
            }
          };
        });
      });
      setEdges((eds) => eds.filter((e) => !deletedIds.includes(e.source) && !deletedIds.includes(e.target)));
      setSelection((sel) => ({
        nodeIds: sel.nodeIds.filter((id) => !deletedIds.includes(id)),
        edgeIds: sel.edgeIds.filter((id) => !deletedIds.includes(id)),
      }));
    },
    [nodes, edges, setNodes, setEdges]
  );

  // --- Hierarchy Helpers ---

  const getTargetStage = useCallback((): StageNode | null => {
    return nodesManager.getTargetStage(selection.nodeIds[0] || null);
  }, [nodesManager, selection.nodeIds]);

  const ensureContainerHierarchy = useCallback((): { fieldId: string; stageId: string } => {
    return nodesManager.ensureContainerHierarchy(selection.nodeIds[0] || null);
  }, [nodesManager, selection.nodeIds]);

  const getGameField = useCallback((gameId: string): FieldNode | null => {
    const game = nodes.find((n) => n.id === gameId && isGameNode(n));
    if (!game?.parentId) return null;
    const stage = nodes.find((n) => n.id === game.parentId && isStageNode(n));
    if (!stage?.parentId) return null;
    return nodes.find((n) => n.id === stage.parentId && isFieldNode(n)) as FieldNode || null;
  }, [nodes]);

  const getGameStage = useCallback((gameId: string): StageNode | null => {
    const game = nodes.find((n) => n.id === gameId && isGameNode(n));
    if (!game?.parentId) return null;
    return nodes.find((n) => n.id === game.parentId && isStageNode(n)) as StageNode || null;
  }, [nodes]);

  return {
    nodes,
    edges,
    fields,
    globalTeams,
    globalTeamGroups,
    selectedNode: nodes.find((n) => n.id === selection.nodeIds[0]) || null,
    selection,
    onNodesChange,
    onEdgesChange,
    ...nodesManager,
    ...edgesManager,
    ...teamPoolManager,
    addGameNode, // Overrides nodesManager.addGameNode (v1 behavior)
    deleteNode, // Overrides managers
    addField,
    updateField,
    deleteField,
    selectNode,
    setSelection,
    clearAll,
    importState,
    exportState,
    getTargetStage,
    ensureContainerHierarchy,
    getGameField,
    getGameStage,
    getTeamField: () => null, // Placeholder
    getTeamStage: () => null, // Placeholder
    getFieldStages: (fieldId) => nodes.filter((n) => isStageNode(n) && n.parentId === fieldId) as StageNode[],
    getStageGames: (stageId) => nodes.filter((n) => isGameNode(n) && n.parentId === stageId) as GameNode[],
    selectedContainerField: nodes.find((n) => n.id === selection.nodeIds[0] && isFieldNode(n)) as FieldNode || null,
    selectedContainerStage: nodes.find((n) => n.id === selection.nodeIds[0] && isStageNode(n)) as StageNode || null,
    setEdges,
    matchNames: useMemo(() => nodes.filter(isGameNode).map((n) => n.data.standing).filter(Boolean), [nodes]),
    groupNames: useMemo(() => ['Gruppe 1', 'Gruppe 2', 'Gruppe A', 'Gruppe B'], []),
    addBulkGames: (games) => setNodes((nds) => [...nds, ...games]),
    moveNodeToStage: () => {}, // Placeholder
  };
}