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
import { scrollToGameWithExpansion } from '../utils/scrollHelpers';
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
import type { GlobalTeam } from '../types/flowchart';
import type { TournamentGenerationConfig } from '../types/tournament';

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
  const validation = useFlowValidation(nodes, edges);

  // --- UI State ---
  const [highlightedSourceGameId, setHighlightedSourceGameId] = useState<string | null>(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  // --- UI Actions ---

  const expandField = useCallback((fieldId: string) => {
    setExpandedFieldIds((prev) => new Set([...prev, fieldId]));
  }, []);

  const expandStage = useCallback((stageId: string) => {
    setExpandedStageIds((prev) => new Set([...prev, stageId]));
  }, []);

  const handleDynamicReferenceClick = useCallback(
    async (sourceGameId: string) => {
      setHighlightedSourceGameId(sourceGameId);
      await scrollToGameWithExpansion(sourceGameId, nodes, expandField, expandStage, true);
      setTimeout(() => {
        setHighlightedSourceGameId(null);
      }, HIGHLIGHT_AUTO_CLEAR_DELAY);
    },
    [nodes, expandField, expandStage]
  );

  const handleImport = useCallback(
    (json: unknown) => {
      const errors = validateScheduleJson(json);
      if (errors.length > 0) {
        alert(`Invalid JSON format:\n${errors.join('\n')}`);
        return;
      }

      const result = importFromScheduleJson(json);
      if (!result.success || !result.state) {
        alert(`Import failed:\n${result.errors.join('\n')}`);
        return;
      }

      importState(result.state);
    },
    [importState]
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
  }, [exportState]);

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
      } catch (error) {
        console.error('Failed to generate tournament:', error);
      }
    },
    [globalTeams, globalTeamGroups, addBulkTournament, addGlobalTeam, addGlobalTeamGroup, updateGlobalTeam, assignTeamsToTournament]
  );

  const canExport = useMemo(() => {
    return nodes.some((n) => n.type === 'game') && fields.length > 0;
  }, [nodes, fields]);

  return {
    // State
    ...flowState,
    validation,
    ui: {
      highlightedSourceGameId,
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
    }
  };
}
