/**
 * useDesignerController Hook
 *
 * Dedicated controller hook for ListDesignerApp to manage UI-specific logic,
 * event handlers, and orchestration of multiple state domains.
 */

import { useCallback, useMemo, useState } from 'react';
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
import type { GlobalTeam, HighlightedElement, Notification, NotificationType } from '../types/flowchart';
import type { TournamentGenerationConfig } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export function useDesignerController(
  flowState: UseFlowStateReturn,
  onMetadataHighlight?: () => void
) {
  const {
    metadata = {} as GamedayMetadata,
    nodes = [],
    edges = [],
    fields = [],
    globalTeams = [],
    globalTeamGroups = [],
    addFieldNode = () => ({} as FlowNode),
    addStageNode = () => {},
    addBulkTournament = () => {},
    updateNode = () => {},
    deleteNode = () => {},
    selectNode = () => {},
    updateMetadata = () => {},
    clearAll = () => {},
    clearSchedule = () => {},
    importState = () => {},
    exportState = () => ({} as FlowState),
    addGlobalTeam = () => ({} as GlobalTeam),
    updateGlobalTeam = () => {},
    deleteGlobalTeam = () => {},
    reorderGlobalTeam = () => {},
    addGlobalTeamGroup = () => ({} as GlobalTeamGroup),
    assignTeamToGame = () => {},
    replaceGlobalTeam = () => {},
    addBulkGameToGameEdges = () => {},
    addBulkFields = () => {},
  } = flowState || {};

  // Validate the current flowchart
  const validation = useFlowValidation(nodes, edges, fields, globalTeams, globalTeamGroups, metadata);

  // --- UI State ---
  const [highlightedElement, setHighlightedElement] = useState<HighlightedElement | null>(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- UI Actions ---

  const addNotification = useCallback((message: string, type: NotificationType = 'info', title?: string, undoAction?: () => void, duration?: number) => {
    const id = uuidv4();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, title, show: true, undoAction, duration }
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, show: false } : n));
    // Clean up after animation
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
      await scrollToElementWithExpansion(id, type, nodes, expandField, expandStage, true);
      setTimeout(() => {
        setHighlightedElement(null);
      }, HIGHLIGHT_AUTO_CLEAR_DELAY);
    },
    [nodes, expandField, expandStage, onMetadataHighlight]
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

      importState(result.state);
      addNotification('Schedule imported successfully', 'success', 'Import Success');
    },
    [importState, addNotification]
  );

  const handleExport = useCallback(() => {
    const state = exportState();
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
  }, [exportState, addNotification]);

  const assignTeamsToTournament = useCallback(
    (structure: TournamentStructure, teams: GlobalTeam[], clearExisting: boolean = false) => {
      const operations = assignTeamsToTournamentGames(structure, teams);
      operations.forEach((op) => {
        if (op.type === 'assign_team') {
          assignTeamToGame(op.gameId, op.teamId, op.slot);
        } else if (op.type === 'add_edges') {
          addBulkGameToGameEdges(op.edges, clearExisting);
        }
      });
    },
    [assignTeamToGame, addBulkGameToGameEdges]
  );

  const handleGenerateTournament = useCallback(
    async (config: TournamentGenerationConfig & { 
      generateTeams: boolean; 
      autoAssignTeams: boolean;
      selectedTeamIds?: string[];
    }) => {
      try {
        // Auto-clear existing structure before generating new one
        let teamsToUse = globalTeams;
        if (config.generateTeams) {
          clearAll();
          teamsToUse = []; // Start fresh if generating new teams
        } else {
          clearSchedule();
          // If we have selected teams, filter the pool
          if (config.selectedTeamIds && config.selectedTeamIds.length > 0) {
            teamsToUse = globalTeams.filter(t => config.selectedTeamIds!.includes(t.id));
          }
        }

        if (config.generateTeams) {
          const teamCount = config.template.teamCount.exact || config.template.teamCount.min;
          
          // Determine group count from template
          const firstStage = config.template.stages?.[0];
          let groupCount = 1;
          if (firstStage && firstStage.fieldAssignment === 'split') {
            groupCount = firstStage.splitCount || config.fieldCount;
            // Round robin calculation fallback
            if (firstStage.splitCount === undefined && firstStage.progressionMode === 'round_robin') {
              const teamsPerGroup = (firstStage.config as RoundRobinConfig).teamCount;
              if (teamsPerGroup > 0) {
                groupCount = Math.floor(teamCount / teamsPerGroup);
              }
            }
          }

          // Create groups if they don't exist
          const groupIds: string[] = [];
          for (let i = 0; i < groupCount; i++) {
            const groupName = groupCount > 1 ? `Gruppe ${String.fromCharCode(65 + i)}` : DEFAULT_TOURNAMENT_GROUP_NAME;
            const newGroup = addGlobalTeamGroup(groupName);
            groupIds.push(newGroup.id);
          }

          const teamData = generateTeamsForTournament(teamCount);
          const teamsPerGroupCount = Math.ceil(teamCount / groupCount);
          
          const newTeams: GlobalTeam[] = teamData.map((data, index) => {
            const groupIndex = Math.min(Math.floor(index / teamsPerGroupCount), groupIds.length - 1);
            const team = addGlobalTeam(data.label, groupIds[groupIndex]);
            updateGlobalTeam(team.id, { color: data.color });
            return { ...team, color: data.color };
          });

          teamsToUse = [...globalTeams, ...newTeams];
        }

        const structure = generateTournament(teamsToUse, config);
        
        // 1. Pre-resolve team assignments within the structure object 
        // so that the referee assignment logic knows which teams are playing in each game.
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

        // 2. Assign referees to all games using smart round-robin.
        // This will now correctly identify playing teams because they are set in game.data.
        const gamesWithRefs = assignRefereesToGames(structure.games, structure.stages, teamsToUse);
        const structureWithRefs = {
          ...structure,
          games: gamesWithRefs,
        };
        
        addBulkTournament(structureWithRefs, true);
        addBulkFields(structureWithRefs.fields.map(f => ({ id: f.id, name: f.data.name, order: f.data.order, color: f.data.color })), true);

        // 3. Perform the actual stateful team assignments (handles edges, etc.)
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
    [globalTeams, clearAll, clearSchedule, addBulkTournament, addBulkFields, addGlobalTeam, addGlobalTeamGroup, updateGlobalTeam, assignTeamsToTournament, addNotification]
  );

  const handleSwapTeams = useCallback(
    (gameId: string) => {
      const game = nodes.find((n) => n.id === gameId);
      if (!game || game.type !== 'game') return;

      const { homeTeamId, awayTeamId, homeTeamDynamic, awayTeamDynamic } = game.data;
      updateNode(gameId, {
        homeTeamId: awayTeamId,
        awayTeamId: homeTeamId,
        homeTeamDynamic: awayTeamDynamic,
        awayTeamDynamic: homeTeamDynamic,
      });
    },
    [nodes, updateNode]
  );

  const canExport = useMemo(() => {
    return nodes.some((n) => n.type === 'game') && fields.length > 0;
  }, [nodes, fields]);

  const uiInternal = useMemo(() => ({
    highlightedElement,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasData: nodes.length > 0 || globalTeams.length > 0 || fields.length > 0,
    saveTrigger: flowState?.saveTrigger,
  }), [highlightedElement, expandedFieldIds, expandedStageIds, showTournamentModal, canExport, nodes.length, globalTeams.length, fields.length, flowState?.saveTrigger]);

  const handlersInternal = useMemo(() => ({
    expandField,
    expandStage,
    handleHighlightElement,
    handleDynamicReferenceClick,
    handleImport,
    handleExport,
    handleClearAll: clearAll,
    handleUpdateNode: updateNode,
    handleUpdateGlobalTeam: updateGlobalTeam,
    handleDeleteGlobalTeam: deleteGlobalTeam,
    handleReplaceGlobalTeam: replaceGlobalTeam,
    handleReorderGlobalTeam: reorderGlobalTeam,
    handleAssignTeam: assignTeamToGame,
    handleConnectTeam: (team: { id: number; text: string }, groupId: string) => {
      addGlobalTeam(team.text, groupId, team.id);
    },
    handleSwapTeams,
    handleDeleteNode: deleteNode,
    handleSelectNode: selectNode,
    handleGenerateTournament,
    setShowTournamentModal,
    handleAddGlobalTeam: (groupId: string) => addGlobalTeam(undefined, groupId),
    handleAddGlobalTeamGroup: () => addGlobalTeamGroup(),
    handleAddFieldContainer: () => addFieldNode({}, true),
    handleAddStage: (fieldId: string) => addStageNode(fieldId),
    dismissNotification,
    addNotification,
    onMetadataHighlight,
    replaceGlobalTeam
  }), [
    expandField, expandStage, handleHighlightElement, handleDynamicReferenceClick,
    handleImport, handleExport, clearAll, updateNode, updateGlobalTeam, 
    deleteGlobalTeam, reorderGlobalTeam, assignTeamToGame, handleSwapTeams, 
    deleteNode, selectNode, handleGenerateTournament, addGlobalTeam, 
    addGlobalTeamGroup, addFieldNode, addStageNode, dismissNotification, 
    addNotification, onMetadataHighlight, replaceGlobalTeam
  ]);
  return useMemo(() => ({
    // State
    ...flowState,
    validation,
    notifications,
    updateMetadata,
    ui: uiInternal,
    // Explicitly expose these from flowState if not already in ...flowState
    updateGlobalTeamGroup: flowState?.updateGlobalTeamGroup,
    deleteGlobalTeamGroup: flowState?.deleteGlobalTeamGroup,
    reorderGlobalTeamGroup: flowState?.reorderGlobalTeamGroup,
    replaceGlobalTeam: flowState?.replaceGlobalTeam,
    getTeamUsage: flowState?.getTeamUsage,
    addGameToGameEdge: flowState?.addGameToGameEdge,
    addStageToGameEdge: flowState?.addStageToGameEdge,
    removeEdgeFromSlot: flowState?.removeEdgeFromSlot,
    addGameNodeInStage: flowState?.addGameNodeInStage,
    importState: flowState?.importState,
    exportState: flowState?.exportState,
    undo: flowState?.undo,
    redo: flowState?.redo,
    canUndo: flowState?.canUndo,
    canRedo: flowState?.canRedo,
    stats: flowState?.stats,
    onMetadataHighlight,
    
    // Handlers
    handlers: handlersInternal
  }), [
    flowState, validation, notifications, updateMetadata, uiInternal, handlersInternal, onMetadataHighlight
  ]);
}
