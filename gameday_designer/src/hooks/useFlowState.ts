import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import i18n from '../i18n/config';
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
  GamedayMetadata,
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
import { resolveBracketReferences } from '../utils/bracketResolution';

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
 * Return type for the useFlowState hook.
 */
export type UseFlowStateReturn = ReturnType<typeof useFlowStateInternal>;

/**
 * useFlowState hook.
 *
 * Orchestrates specialized hooks for managing the complete state of the flowchart designer.
 */
export function useFlowState(initialState?: Partial<FlowState>, onStateChange?: () => void): UseFlowStateReturn {
  return useFlowStateInternal(initialState, onStateChange);
}

function useFlowStateInternal(initialState?: Partial<FlowState>, onStateChange?: () => void) {
  // --- Core State ---
  const [saveTrigger, setSaveTrigger] = useState(0);

  const [metadata, setMetadata] = useState<GamedayMetadata>(initialState?.metadata ? {
    ...initialState.metadata,
    date: initialState.metadata.date || ''
  } : {
    id: 0,
    name: '',
    date: '',
    start: '10:00',
    format: '6_2',
    author: 0,
    address: '',
    season: 0,
    league: 0,
    status: 'DRAFT',
  });

  const [nodes, setNodes] = useState<FlowNode[]>(initialState?.nodes ?? []);
  const [edges, setEdges] = useState<FlowEdge[]>(initialState?.edges ?? []);
  const [fields, setFields] = useState<FlowField[]>(initialState?.fields ?? []);
  const [globalTeams, setGlobalTeams] = useState<GlobalTeam[]>(initialState?.globalTeams ?? []);
  const [globalTeamGroups, setGlobalTeamGroups] = useState<GlobalTeamGroup[]>(initialState?.globalTeamGroups ?? []);
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], edgeIds: [] });
  const hasInitializedOfficials = useRef(false);

  // --- History Management ---
  const historyRef = useRef<FlowState[]>([]);
  const currentIndexRef = useRef(-1);
  const isInternalUpdateRef = useRef(false);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const captureHistory = useCallback((state: FlowState) => {
    if (isInternalUpdateRef.current) return;

    const lastState = historyRef.current[currentIndexRef.current];
    if (lastState && JSON.stringify(lastState) === JSON.stringify(state)) return;

    // Truncate future if we are in the middle of history
    const newHistory = historyRef.current.slice(0, currentIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(state)));

    // Limit history size
    if (newHistory.length > 50) newHistory.shift();

    historyRef.current = newHistory;
    currentIndexRef.current = newHistory.length - 1;
    
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Capture history whenever state changes externally
  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      captureHistory({ metadata, nodes, edges, fields, globalTeams, globalTeamGroups });
    }
  }, [metadata, nodes, edges, fields, globalTeams, globalTeamGroups, captureHistory]);

  const handleStateChange = useCallback(() => {
    setSaveTrigger(prev => prev + 1);
    onStateChange?.();
  }, [onStateChange]);

  // --- Bracket Resolution ---
  useEffect(() => {
    if (isInternalUpdateRef.current) return;

    const resolvedNodes = resolveBracketReferences(nodes, globalTeams);
    if (JSON.stringify(resolvedNodes) !== JSON.stringify(nodes)) {
      isInternalUpdateRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNodes(resolvedNodes);
      setTimeout(() => { isInternalUpdateRef.current = false; }, 0);
    }
  }, [nodes, globalTeams]);

  const undo = useCallback(() => {
    if (currentIndexRef.current <= 0) return;

    isInternalUpdateRef.current = true;
    currentIndexRef.current--;
    const prevState = historyRef.current[currentIndexRef.current];

    setMetadata(prevState.metadata);
    setNodes(prevState.nodes);
    setEdges(prevState.edges);
    setFields(prevState.fields);
    setGlobalTeams(prevState.globalTeams);
    setGlobalTeamGroups(prevState.globalTeamGroups);
    
    setSaveTrigger(prev => prev + 1);
    onStateChange?.();
    
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
    
    // Release lock after state updates are scheduled
    setTimeout(() => { isInternalUpdateRef.current = false; }, 0);
  }, [onStateChange]);

  const redo = useCallback(() => {
    if (currentIndexRef.current >= historyRef.current.length - 1) return;

    isInternalUpdateRef.current = true;
    currentIndexRef.current++;
    const nextState = historyRef.current[currentIndexRef.current];

    setMetadata(nextState.metadata);
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    setFields(nextState.fields);
    setGlobalTeams(nextState.globalTeams);
    setGlobalTeamGroups(nextState.globalTeamGroups);
    
    setSaveTrigger(prev => prev + 1);
    onStateChange?.();

    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);

    setTimeout(() => { isInternalUpdateRef.current = false; }, 0);
  }, [onStateChange]);

  // --- Specialized Hooks ---
  const nodesManager = useNodesState(nodes, (newNodes) => {
    setNodes(newNodes);
    handleStateChange();
  });
  const edgesManager = useEdgesState(edges, (newEdges) => {
    setEdges(newEdges);
    handleStateChange();
  }, setNodes);
  const teamPoolManager = useTeamPoolState(
    globalTeams,
    (newTeams) => {
      setGlobalTeams(newTeams);
      handleStateChange();
    },
    globalTeamGroups,
    (newGroups) => {
      setGlobalTeamGroups(newGroups);
      handleStateChange();
    },
    nodes,
    setNodes
  );

  // --- Initialization ---

  const {
    addBulkGameToGameEdges,
    addStageToGameEdge,
    removeEdgeFromSlot,
    ...edgesManagerProps
  } = edgesManager;

  // --- Actions ---

  const updateMetadata = useCallback((data: Partial<GamedayMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...data }));
    handleStateChange();
  }, [handleStateChange]);

  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelection({ nodeIds: nodeId ? [nodeId] : [], edgeIds: [] });
  }, []);

  const addField = useCallback((name: string): FlowField => {
    const id = `field-${uuidv4()}`;
    const newField = createFlowField(id, name, fields.length);
    setFields((flds) => [...flds, newField]);
    handleStateChange();
    return newField;
  }, [fields, handleStateChange]);

  const updateField = useCallback((fieldId: string, name: string) => {
    setFields((flds) => flds.map((f) => (f.id === fieldId ? { ...f, name } : f)));
    handleStateChange();
  }, [handleStateChange]);

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
    handleStateChange();
  }, [handleStateChange]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFields([]);
    setGlobalTeams([]);
    setGlobalTeamGroups([]);
    setSelection({ nodeIds: [], edgeIds: [] });
    // When clearing everything, we should also allow re-initialization of officials group if needed
    hasInitializedOfficials.current = false;
    handleStateChange();
  }, [handleStateChange]);

  const clearSchedule = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelection({ nodeIds: [], edgeIds: [] });
    handleStateChange();
  }, [handleStateChange]);

  const importState = useCallback((state: FlowState) => {
    if (state.metadata) {
      setMetadata(prev => ({
        ...state.metadata,
        date: state.metadata.date || '',
        status: state.metadata.status || prev.status || 'DRAFT'
      }));
    }
    setNodes(state.nodes || []);
    setEdges(state.edges || []);
    setFields(state.fields || []);
    const migratedTeams = (state.globalTeams || []).map((team: GlobalTeam & { reference?: string }) => {
      if ('reference' in team && !('groupId' in team)) {
        return { id: team.id, label: team.label || 'Team', groupId: null, order: team.order };
      }
      return team;
    });
    setGlobalTeams(migratedTeams);
    setGlobalTeamGroups(state.globalTeamGroups || []);
    setSelection({ nodeIds: [], edgeIds: [] });
    handleStateChange();
  }, [handleStateChange]);

  const exportState = useCallback((): FlowState => {
    return {
      metadata,
      nodes,
      edges,
      fields,
      globalTeams,
      globalTeamGroups,
    };
  }, [metadata, nodes, edges, fields, globalTeams, globalTeamGroups]);

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
      onStateChange?.();
      return newNode;
    },
    [nodes, onStateChange]
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
      onStateChange?.();
    },
    [nodes, edges, onStateChange]
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

  const stats = useMemo(() => ({
    fieldCount: fields.length,
    gameCount: nodes.filter(isGameNode).length,
    teamCount: globalTeams.filter(t => t.groupId !== 'group-officials').length,
  }), [fields.length, nodes, globalTeams]);

  const getFieldStages = useCallback((fieldId: string) => 
    nodes.filter((n) => isStageNode(n) && n.parentId === fieldId) as StageNode[], 
  [nodes]);

  const getStageGames = useCallback((stageId: string) => 
    nodes.filter((n) => isGameNode(n) && n.parentId === stageId) as GameNode[], 
  [nodes]);

  const matchNames = useMemo(() => nodes.filter(isGameNode).map((n) => n.data.standing).filter(Boolean), [nodes]);
  const groupNames = useMemo(() => ['Gruppe 1', 'Gruppe 2', 'Gruppe A', 'Gruppe B'], []);

  const addBulkGames = useCallback((games: FlowNode[]) => {
    setNodes((nds) => [...nds, ...games]);
    onStateChange?.();
  }, [onStateChange]);

  const addBulkFields = useCallback((newFields: FlowField[], clearExisting: boolean = false) => {
    setFields((prev) => {
      const base = clearExisting ? [] : prev;
      return [...base, ...newFields];
    });
    onStateChange?.();
  }, [onStateChange]);

  const addBulkGamesToGameEdgesCb = useCallback((newEdges: GameToGameEdge[], clearExisting?: boolean) => {
    addBulkGameToGameEdges(newEdges, clearExisting);
  }, [addBulkGameToGameEdges]);

  const addStageToGameEdgeCb = useCallback((sourceStageId: string, sourceRank: number, targetGameId: string, targetPort: 'home' | 'away', sourceGroup?: string) => {
    addStageToGameEdge(sourceStageId, sourceRank, targetGameId, targetPort, sourceGroup);
  }, [addStageToGameEdge]);

  const removeEdgeFromSlotCb = useCallback((targetNodeId: string, targetHandle: 'home' | 'away') => {
    removeEdgeFromSlot(targetNodeId, targetHandle);
  }, [removeEdgeFromSlot]);

  const addOfficialsGroup = useCallback(() => {
    teamPoolManager.ensureOfficialsGroup(i18n.t('ui:label.externalOfficials'));
  }, [teamPoolManager]);

  return useMemo(() => ({
    metadata,
    nodes,
    edges,
    fields,
    globalTeams,
    globalTeamGroups,
    saveTrigger,
    undo,
    redo,
    canUndo,
    canRedo,
    stats,
    selectedNode: nodes.find((n) => n.id === selection.nodeIds[0]) || null,
    selection,
    onNodesChange,
    onEdgesChange,
    ...nodesManager,
    ...edgesManagerProps,
    ...teamPoolManager,
    addBulkGameToGameEdges: addBulkGamesToGameEdgesCb,
    addStageToGameEdge: addStageToGameEdgeCb,
    removeEdgeFromSlot: removeEdgeFromSlotCb,
    addOfficialsGroup,
    addGameNode, // Overrides nodesManager.addGameNode (v1 behavior)
    deleteNode, // Overrides managers
    addField,
    updateField,
    deleteField,
    selectNode,
    updateMetadata,
    setSelection,
    clearAll,
    clearSchedule,
    importState,
    exportState,
    getTargetStage,
    ensureContainerHierarchy,
    getGameField,
    getGameStage,
    getTeamField: () => null, // Placeholder
    getTeamStage: () => null, // Placeholder
    getFieldStages,
    getStageGames,
    selectedContainerField: nodes.find((n) => n.id === selection.nodeIds[0] && isFieldNode(n)) as FieldNode || null,
    selectedContainerStage: nodes.find((n) => n.id === selection.nodeIds[0] && isStageNode(n)) as StageNode || null,
    setEdges,
    matchNames,
    groupNames,
    addBulkGames,
    addBulkFields,
    moveNodeToStage: () => {}, // Placeholder
    // Explicitly export these from managers
    addFieldNode: nodesManager.addFieldNode,
    addStageNode: nodesManager.addStageNode,
    addBulkTournament: nodesManager.addBulkTournament,
    addGlobalTeam: teamPoolManager.addGlobalTeam,
    updateGlobalTeam: teamPoolManager.updateGlobalTeam,
    deleteGlobalTeam: teamPoolManager.deleteGlobalTeam,
    reorderGlobalTeam: teamPoolManager.reorderGlobalTeam,
    addGlobalTeamGroup: teamPoolManager.addGlobalTeamGroup,
    assignTeamToGame: teamPoolManager.assignTeamToGame,
    ensureOfficialsGroup: teamPoolManager.ensureOfficialsGroup,
    updateNode: nodesManager.updateNode,
  }), [
    metadata, nodes, edges, fields, globalTeams, globalTeamGroups, saveTrigger,
    undo, redo, canUndo, canRedo, stats, selection, onNodesChange, onEdgesChange,
    nodesManager, edgesManagerProps, teamPoolManager, addBulkGamesToGameEdgesCb,
    addStageToGameEdgeCb, removeEdgeFromSlotCb, addOfficialsGroup, addGameNode, deleteNode, 
    addField, updateField, deleteField, selectNode, updateMetadata, 
    setSelection, clearAll, clearSchedule, importState, exportState, 
    getTargetStage, ensureContainerHierarchy, getGameField, getGameStage, 
    getFieldStages, getStageGames, matchNames, groupNames, addBulkGames, addBulkFields
  ]);
}
