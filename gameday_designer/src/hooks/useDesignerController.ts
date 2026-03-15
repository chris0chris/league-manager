/**
 * useDesignerController Hook
 *
 * Dedicated controller hook for ListDesignerApp to manage UI-specific logic,
 * event handlers, and orchestration of multiple state domains.
 */

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useFlowValidation } from './useFlowValidation';
import { downloadFlowchartAsJson, validateForExport } from '../utils/flowchartExport';
import { importFromScheduleJson, validateScheduleJson } from '../utils/flowchartImport';
import { scrollToElementWithExpansion } from '../utils/scrollHelpers';
import { generateTournament, TournamentStructure } from '../utils/tournamentGenerator';
import {
  generateTeamsForTournament,
  assignTeamsToTournamentGames,
} from '../utils/teamAssignment';
import { assignRefereesToGames } from '../utils/refAssignment';
import {
  HIGHLIGHT_AUTO_CLEAR_DELAY,
  TOURNAMENT_GENERATION_STATE_DELAY,
  DEFAULT_TOURNAMENT_GROUP_NAME,
} from '../utils/tournamentConstants';
import type { GlobalTeam, HighlightedElement, Notification, NotificationType, FlowState } from '../types/flowchart';
import type { TournamentGenerationConfig, RoundRobinConfig } from '../types/tournament';
import type { UseFlowStateReturn, GamedayMetadata } from '../types/designer';
import { v4 as uuidv4 } from 'uuid';
import { gamedayApi } from '../api/gamedayApi';

export function useDesignerController(
  gamedayId: string | undefined,
  flowState: UseFlowStateReturn,
  onMetadataHighlight?: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HighlightedElement | null>(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Stable references to flowState methods to avoid stale closures without triggering re-renders of handlers
  const flowStateRef = useRef(flowState);
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  const loadData = useCallback(async () => {
    if (!gamedayId) return;
    setIsLoading(true);
    try {
      const state = await gamedayApi.getDesignerState(parseInt(gamedayId));
      if (state && state.state_data) {
        flowStateRef.current?.importState(state.state_data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [gamedayId]);

  const saveData = useCallback(async (state: FlowState) => {
    if (!gamedayId) return;
    try {
      await gamedayApi.updateDesignerState(parseInt(gamedayId), state);
    } catch (error) {
      console.error('Failed to save designer state', error);
    }
  }, [gamedayId]);

  // Validate the current flowchart
  const validation = useFlowValidation(
    flowState?.nodes || [], 
    flowState?.edges || [], 
    flowState?.fields || [], 
    flowState?.globalTeams || [], 
    flowState?.globalTeamGroups || [], 
    flowState?.metadata || {} as GamedayMetadata
  );

  const addNotification = useCallback((message: string, type: NotificationType = 'info', title?: string, undoAction?: () => void, duration?: number) => {
    const id = uuidv4();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, title, show: true, undoAction, duration }
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, show: false } : n));
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  const expandField = useCallback((fieldId: string) => {
    setExpandedFieldIds((prev) => new Set([...prev, fieldId]));
  }, []);

  const expandStage = useCallback((stageId: string) => {
    setExpandedStageIds((prev) => new Set([...prev, stageId]));
  }, []);

  const handleHighlightElement = useCallback(
    async (id: string, type: HighlightedElement['type']) => {
      if (type === 'metadata' && onMetadataHighlight) {
        onMetadataHighlight();
      }
      setHighlightedElement({ id, type });
      await scrollToElementWithExpansion(id, type, flowStateRef.current?.nodes || [], expandField, expandStage, true);
      setTimeout(() => {
        setHighlightedElement(null);
      }, HIGHLIGHT_AUTO_CLEAR_DELAY);
    },
    [expandField, expandStage, onMetadataHighlight]
  );

  const handleDynamicReferenceClick = useCallback(
    (sourceGameId: string) => {
      handleHighlightElement(sourceGameId, 'game');
    },
    [handleHighlightElement]
  );

  const handleImport = useCallback(
    (json: unknown) => {
      const errors = validateScheduleJson(json);
      if (errors.length > 0) {
        addNotification(`Invalid JSON format: ${errors.join(', ')}`, 'danger', 'Import Error');
        return;
      }

      const result = importFromScheduleJson(json);
      if (!result.success || !result.state) {
        addNotification(`Import failed: ${result.errors.join(', ')}`, 'danger', 'Import Error');
        return;
      }

      flowStateRef.current?.importState(result.state);
      addNotification('Schedule imported successfully', 'success', 'Import Success');
    },
    [addNotification]
  );

  const handleExport = useCallback(() => {
    const state = flowStateRef.current?.exportState();
    const errors = validateForExport(state);
    if (errors.length > 0) {
      addNotification(
        `Export may be incomplete: ${errors.length} validation issues found. Check the validation panel for details.`,
        'warning',
        'Export'
      );
    }
    downloadFlowchartAsJson(state);
    addNotification('Schedule exported successfully', 'success', 'Export Success');
  }, [addNotification]);

  const assignTeamsToTournament = useCallback(
    (structure: TournamentStructure, teams: GlobalTeam[], clearExisting: boolean = false) => {
      const operations = assignTeamsToTournamentGames(structure, teams);
      operations.forEach((op) => {
        if (op.type === 'assign_team') {
          flowStateRef.current?.assignTeamToGame(op.gameId, op.teamId, op.slot);
        } else if (op.type === 'add_edges') {
          flowStateRef.current?.addBulkGameToGameEdges(op.edges, clearExisting);
        }
      });
    },
    []
  );

  const handleGenerateTournament = useCallback(
    async (config: TournamentGenerationConfig & { 
      generateTeams: boolean; 
      autoAssignTeams: boolean;
      selectedTeamIds?: string[];
    }) => {
      try {
        const fs = flowStateRef.current;
        const currentTeams = fs?.globalTeams || [];
        let teamsToUse = currentTeams;
        
        const generatedGroups: GlobalTeamGroup[] = [];
        if (config.generateTeams) {
          const teamCount = config.template.teamCount.exact || config.template.teamCount.min;
          const firstStage = config.template.stages?.[0];
          let groupCount = 1;
          if (firstStage && firstStage.fieldAssignment === 'split') {
            groupCount = firstStage.splitCount || config.fieldCount;
            if (firstStage.splitCount === undefined && firstStage.progressionMode === 'round_robin') {
              const teamsPerGroup = (firstStage.config as RoundRobinConfig).teamCount;
              if (teamsPerGroup > 0) {
                groupCount = Math.floor(teamCount / teamsPerGroup);
              }
            }
          }

          const groupIds: string[] = [];
          for (let i = 0; i < groupCount; i++) {
            const groupName = groupCount > 1 ? `Gruppe ${String.fromCharCode(65 + i)}` : DEFAULT_TOURNAMENT_GROUP_NAME;
            const newGroup = fs?.addGlobalTeamGroup(groupName);
            if (newGroup) {
              groupIds.push(newGroup.id);
              generatedGroups.push(newGroup);
            }
          }

          const teamData = generateTeamsForTournament(teamCount);
          const teamsPerGroupCount = Math.ceil(teamCount / groupCount);
          
          const newTeams: GlobalTeam[] = teamData.map((data, index) => {
            const groupIndex = Math.min(Math.floor(index / teamsPerGroupCount), groupIds.length - 1);
            const team = fs?.addGlobalTeam(data.label, groupIds[groupIndex]);
            fs?.updateGlobalTeam(team.id, { color: data.color });
            return { ...team, color: data.color };
          });

          teamsToUse = newTeams;
        } else {
          if (config.selectedTeamIds && config.selectedTeamIds.length > 0) {
            teamsToUse = currentTeams.filter(t => config.selectedTeamIds!.includes(t.id));
          }
        }

        // Prepare structure
        const structure = generateTournament(teamsToUse, config);
        
        if (config.autoAssignTeams && teamsToUse.length > 0) {
          const operations = assignTeamsToTournamentGames(structure, teamsToUse);
          operations.forEach((op) => {
            if (op.type === 'assign_team') {
              const game = structure.games.find(g => g.id === op.gameId);
              if (game) {
                if (op.slot === 'home') game.data.homeTeamId = op.teamId;
                else if (op.slot === 'away') game.data.awayTeamId = op.teamId;
              }
            }
          });
        }

        const gamesWithRefs = assignRefereesToGames(structure.games, structure.stages, teamsToUse);
        const structureWithRefs = {
          ...structure,
          games: gamesWithRefs,
        };
        
        // Atomic update of the entire structure using importState
        // We use the latest values from ref to ensure we don't overwrite teams/groups added during this function
        const latestFs = flowStateRef.current;
        fs?.importState({
          metadata: latestFs?.metadata || {} as GamedayMetadata,
          nodes: [...structureWithRefs.fields, ...structureWithRefs.stages, ...structureWithRefs.games],
          edges: [], // Edges will be added by assignTeamsToTournament if needed
          fields: structureWithRefs.fields.map(f => ({ 
            id: f.id, 
            name: f.data.name, 
            order: f.data.order, 
            color: f.data.color 
          })),
          globalTeams: config.generateTeams ? teamsToUse : (latestFs?.globalTeams || []),
          globalTeamGroups: config.generateTeams ? generatedGroups : (latestFs?.globalTeamGroups || []),
        });

        fs?.setSelection({ nodeIds: [], edgeIds: [] });

        if (config.autoAssignTeams && teamsToUse.length > 0) {
          setTimeout(() => {
            assignTeamsToTournament(structureWithRefs, teamsToUse, true);
          }, TOURNAMENT_GENERATION_STATE_DELAY);
        }
        
        setShowTournamentModal(false);
        addNotification('Tournament generated successfully', 'success', 'Generation Success');
      } catch (error) {
        console.error('Failed to generate tournament:', error);
        addNotification('Failed to generate tournament. See console for details.', 'danger', 'Generation Error');
      }
    },
    [addNotification, assignTeamsToTournament]
  );

  const handleSwapTeams = useCallback(
    (gameId: string) => {
      const fs = flowStateRef.current;
      const game = (fs?.nodes || []).find((n) => n.id === gameId);
      if (!game || game.type !== 'game') return;

      const { homeTeamId, awayTeamId, homeTeamDynamic, awayTeamDynamic } = game.data;
      fs?.updateNode(gameId, {
        homeTeamId: awayTeamId,
        awayTeamId: homeTeamId,
        homeTeamDynamic: awayTeamDynamic,
        awayTeamDynamic: homeTeamDynamic,
      });
    },
    []
  );

  const canExport = useMemo(() => {
    return (flowState?.nodes || []).some((n) => n.type === 'game') && (flowState?.fields || []).length > 0;
  }, [flowState?.nodes, flowState?.fields]);

  const uiInternal = useMemo(() => ({
    highlightedElement,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasData: (flowState?.nodes?.length ?? 0) > 0 || (flowState?.globalTeams?.length ?? 0) > 0 || (flowState?.fields?.length ?? 0) > 0,
    saveTrigger: flowState?.saveTrigger,
    isLoading,
    notifications,
  }), [highlightedElement, expandedFieldIds, expandedStageIds, showTournamentModal, canExport, flowState?.nodes?.length, flowState?.globalTeams?.length, flowState?.fields?.length, flowState?.saveTrigger, isLoading, notifications]);

  const handlersInternal = useMemo(() => ({
    loadData,
    saveData,
    expandField,
    expandStage,
    handleHighlightElement,
    handleDynamicReferenceClick,
    handleImport,
    handleExport,
    handleClearAll: () => flowStateRef.current?.clearAll(),
    handleUpdateMetadata: (data: Partial<GamedayMetadata>) => flowStateRef.current?.updateMetadata(data),
    handleUpdateNode: (id: string, data: Record<string, unknown>) => flowStateRef.current?.updateNode(id, data),
    handleUpdateGlobalTeam: (id: string, data: Record<string, unknown>) => flowStateRef.current?.updateGlobalTeam(id, data),
    handleDeleteGlobalTeam: (id: string) => flowStateRef.current?.deleteGlobalTeam(id),
    handleReplaceGlobalTeam: (oldId: string, newTeamData: { id: number; text: string }) => flowStateRef.current?.replaceGlobalTeam(oldId, newTeamData),
    handleReorderGlobalTeam: (id: string, index: number) => flowStateRef.current?.reorderGlobalTeam(id, index),
    handleUpdateGlobalTeamGroup: (id: string, name: string) => flowStateRef.current?.updateGlobalTeamGroup(id, name),
    handleDeleteGlobalTeamGroup: (id: string) => flowStateRef.current?.deleteGlobalTeamGroup(id),
    handleReorderGlobalTeamGroup: (id: string, index: number) => flowStateRef.current?.reorderGlobalTeamGroup(id, index),
    handleAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => flowStateRef.current?.assignTeamToGame(gameId, teamId, slot),
    handleConnectTeam: (team: { id: number; text: string }, groupId: string) => {
      flowStateRef.current?.addGlobalTeam(team.text, groupId, team.id);
    },
    handleSwapTeams,
    handleDeleteNode: (id: string) => flowStateRef.current?.deleteNode(id),
    handleSelectNode: (id: string | null) => flowStateRef.current?.selectNode(id),
    handleGenerateTournament,
    showTournamentModal,
    setShowTournamentModal: (show: boolean) => setShowTournamentModal(show),
    handleAddGlobalTeam: (groupId: string) => flowStateRef.current?.addGlobalTeam(undefined, groupId),
    handleAddOfficialsGroup: () => flowStateRef.current?.addOfficialsGroup(),
    handleAddGlobalTeamGroup: () => flowStateRef.current?.addGlobalTeamGroup(),
    handleAddFieldContainer: () => flowStateRef.current?.addFieldNode({}, true),
    handleAddStage: (fieldId: string) => flowStateRef.current?.addStageNode(fieldId),
    dismissNotification,
    addNotification,
    onMetadataHighlight,
    handleRemoveEdgeFromSlot: (gameId: string, slot: 'home' | 'away') => flowStateRef.current?.removeEdgeFromSlot(gameId, slot),
    handleUpdateGameSlot: (gameId: string, slot: 'home' | 'away', type: string, refId: string) => flowStateRef.current?.addGameNodeInStage(gameId, slot, type, refId),
    handleAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') =>
      flowStateRef.current?.addGameToGameEdge(sourceGameId, outputType, targetGameId, targetSlot),
    handleAddStageToGameEdge: (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: 'home' | 'away', sourceGroup?: string) =>
      flowStateRef.current?.addStageToGameEdge(sourceStageId, sourceRank, targetGameId, targetSlot, sourceGroup),
  }), [
    loadData, saveData, expandField, expandStage, handleHighlightElement, 
    handleDynamicReferenceClick, handleImport, handleExport,
    handleSwapTeams, handleGenerateTournament, showTournamentModal, 
    dismissNotification, addNotification, onMetadataHighlight
  ]);

  return useMemo(() => ({
    metadata: flowState?.metadata,
    nodes: flowState?.nodes || [],
    edges: flowState?.edges || [],
    fields: flowState?.fields || [],
    globalTeams: flowState?.globalTeams || [],
    globalTeamGroups: flowState?.globalTeamGroups || [],
    validation,
    notifications,
    updateMetadata: flowState?.updateMetadata,
    ui: uiInternal,
    handlers: handlersInternal,
    canUndo: flowState?.canUndo,
    canRedo: flowState?.canRedo,
    undo: flowState?.undo,
    redo: flowState?.redo,
    stats: flowState?.stats,
    onMetadataHighlight,
  }), [
    flowState?.metadata, flowState?.nodes, flowState?.edges, flowState?.fields, 
    flowState?.globalTeams, flowState?.globalTeamGroups, flowState?.canUndo, 
    flowState?.canRedo, flowState?.undo, flowState?.redo, flowState?.stats,
    flowState?.updateMetadata,
    validation, notifications, uiInternal, handlersInternal, onMetadataHighlight
  ]);
}
