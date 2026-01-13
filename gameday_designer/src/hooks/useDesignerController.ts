/**
 * useDesignerController Hook
 *
 * Dedicated controller hook for ListDesignerApp to manage UI-specific logic,
 * event handlers, and orchestration of multiple state domains.
 */

import { useCallback, useMemo, useState } from 'react';
import { useFlowState } from './useFlowState';
import { useFlowValidation } from './useFlowValidation';
import { downloadFlowchartAsJson, validateForExport } from '../utils/flowchartExport';
import { importFromScheduleJson, validateScheduleJson } from '../utils/flowchartImport';
import { scrollToElementWithExpansion } from '../utils/scrollHelpers';
import { generateTournament, TournamentStructure } from '../utils/tournamentGenerator';
import {
  generateTeamsForTournament,
  assignTeamsToTournamentGames,
} from '../utils/teamAssignment';
import {
  HIGHLIGHT_AUTO_CLEAR_DELAY,
  TOURNAMENT_GENERATION_STATE_DELAY,
  DEFAULT_TOURNAMENT_GROUP_NAME,
} from '../utils/tournamentConstants';
import type { GlobalTeam, HighlightedElement, Notification, NotificationType } from '../types/flowchart';
import type { TournamentGenerationConfig } from '../types/tournament';
import { v4 as uuidv4 } from 'uuid';

export function useDesignerController() {
  const flowState = useFlowState();
  const {
    nodes,
    edges,
    fields,
    globalTeams,
    globalTeamGroups,
    addFieldNode,
    addStageNode,
    addBulkTournament,
    updateNode,
    deleteNode,
    selectNode,
    clearAll,
    importState,
    exportState,
    addGlobalTeam,
    updateGlobalTeam,
    deleteGlobalTeam,
    reorderGlobalTeam,
    addGlobalTeamGroup,
    assignTeamToGame,
    addBulkGameToGameEdges,
  } = flowState;

  // Validate the current flowchart
  const validation = useFlowValidation(nodes, edges, fields, globalTeams, globalTeamGroups);

  // --- UI State ---
  const [highlightedElement, setHighlightedElement] = useState<HighlightedElement | null>(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- UI Actions ---

  const addNotification = useCallback((message: string, type: NotificationType = 'info', title?: string) => {
    const id = uuidv4();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, title, show: true }
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
      setHighlightedElement({ id, type });
      await scrollToElementWithExpansion(id, type, nodes, expandField, expandStage, true);
      setTimeout(() => {
        setHighlightedElement(null);
      }, HIGHLIGHT_AUTO_CLEAR_DELAY);
    },
    [nodes, expandField, expandStage]
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
      const proceed = window.confirm(
        `The following issues were found:\n\n${errors.join('\n')}\n\nExport anyway?`
      );
      if (!proceed) return;
    }
    downloadFlowchartAsJson(state);
    addNotification('Schedule exported successfully', 'success', 'Export Success');
  }, [exportState, addNotification]);

  const assignTeamsToTournament = useCallback(
    (structure: TournamentStructure, teams: GlobalTeam[]) => {
      const operations = assignTeamsToTournamentGames(structure, teams);
      operations.forEach((op) => {
        if (op.type === 'assign_team') {
          assignTeamToGame(op.gameId, op.teamId, op.slot);
        } else if (op.type === 'add_edges') {
          addBulkGameToGameEdges(op.edges);
        }
      });
    },
    [assignTeamToGame, addBulkGameToGameEdges]
  );

  const handleGenerateTournament = useCallback(
    async (config: TournamentGenerationConfig & { generateTeams: boolean; autoAssignTeams: boolean }) => {
      try {
        let teamsToUse = globalTeams;

        if (config.generateTeams) {
          const teamCount = config.template.teamCount.exact || config.template.teamCount.min;
          let groupId: string | null = null;
          
          if (globalTeamGroups.length === 0) {
            const newGroup = addGlobalTeamGroup(DEFAULT_TOURNAMENT_GROUP_NAME);
            groupId = newGroup.id;
          } else {
            groupId = globalTeamGroups[0].id;
          }

          const teamData = generateTeamsForTournament(teamCount);
          const newTeams: GlobalTeam[] = teamData.map((data) => {
            const team = addGlobalTeam(data.label, groupId!);
            updateGlobalTeam(team.id, { color: data.color });
            return { ...team, color: data.color };
          });

          teamsToUse = [...globalTeams, ...newTeams];
        }

        const structure = generateTournament(teamsToUse, config);
        addBulkTournament(structure);

        if (config.autoAssignTeams && teamsToUse.length > 0) {
          setTimeout(() => {
            assignTeamsToTournament(structure, teamsToUse);
          }, TOURNAMENT_GENERATION_STATE_DELAY);
        }
        
        setShowTournamentModal(false);
        addNotification('Tournament generated successfully', 'success', 'Generation Success');
      } catch (error) {
        console.error('Failed to generate tournament:', error);
        addNotification('Failed to generate tournament. See console for details.', 'danger', 'Generation Error');
      }
    },
    [globalTeams, globalTeamGroups, addBulkTournament, addGlobalTeam, addGlobalTeamGroup, updateGlobalTeam, assignTeamsToTournament, addNotification]
  );

  const canExport = useMemo(() => {
    return nodes.some((n) => n.type === 'game') && fields.length > 0;
  }, [nodes, fields]);

  return {
    // State
    ...flowState,
    validation,
    notifications,
    ui: {
      highlightedElement,
      expandedFieldIds,
      expandedStageIds,
      showTournamentModal,
      canExport,
      hasNodes: nodes.length > 0,
    },
    // Handlers
    handlers: {
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
      handleReorderGlobalTeam: reorderGlobalTeam,
      handleAssignTeam: assignTeamToGame,
      handleDeleteNode: deleteNode,
      handleSelectNode: selectNode,
      handleGenerateTournament,
      setShowTournamentModal,
      handleAddGlobalTeam: (groupId: string) => addGlobalTeam(undefined, groupId),
      handleAddGlobalTeamGroup: () => addGlobalTeamGroup(),
      handleAddFieldContainer: () => addFieldNode({}, true),
      handleAddStage: (fieldId: string) => addStageNode(fieldId),
      dismissNotification,
    }
  };
}
