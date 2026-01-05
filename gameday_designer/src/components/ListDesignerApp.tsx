/**
 * ListDesignerApp Component
 *
 * Main application component for the list-based visual editor
 * for creating flag football tournament schedules.
 *
 * Replaces FlowDesignerApp with a table/list-based UI instead of flowchart.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Popover, ListGroup } from 'react-bootstrap';

import ListCanvas from './ListCanvas';
import FlowToolbar from './FlowToolbar';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import { useFlowState } from '../hooks/useFlowState';
import { useFlowValidation } from '../hooks/useFlowValidation';
import { downloadFlowchartAsJson, validateForExport } from '../utils/flowchartExport';
import { importFromScheduleJson, validateScheduleJson } from '../utils/flowchartImport';
import { scrollToGameWithExpansion } from '../utils/scrollHelpers';
import { generateTournament, TournamentStructure } from '../utils/tournamentGenerator';
import type { GameNodeData, StageNode, GlobalTeam } from '../types/flowchart';
import type { TournamentGenerationConfig } from '../types/tournament';

import './ListDesignerApp.css';

/**
 * Generate a distinct color for a team based on index.
 * Uses a palette of visually distinct colors.
 */
const getTeamColor = (index: number): string => {
  const colors = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Turquoise
    '#e67e22', // Dark Orange
    '#34495e', // Dark Gray Blue
    '#16a085', // Dark Turquoise
    '#c0392b', // Dark Red
    '#27ae60', // Dark Green
    '#8e44ad', // Dark Purple
  ];
  return colors[index % colors.length];
};


/**
 * ListDesignerApp component.
 *
 * Main application layout with:
 * - Toolbar (top)
 * - List canvas (main area)
 * - Properties panel (right sidebar)
 * - Validation footer (bottom)
 */
const ListDesignerApp: React.FC = () => {
  const {
    nodes,
    edges,
    fields,
    globalTeams,
    globalTeamGroups,
    selectedNode,
    addFieldNode,
    addStageNode,
    addGameNodeInStage,
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
    updateGlobalTeamGroup,
    deleteGlobalTeamGroup,
    reorderGlobalTeamGroup,
    getTeamUsage,
    assignTeamToGame,
    addGameToGameEdge,
    addBulkGameToGameEdges,
    removeGameToGameEdge,
  } = useFlowState();

  // Validate the current flowchart
  const validation = useFlowValidation(nodes, edges);

  // State for highlighting source game when badge is clicked
  const [highlightedSourceGameId, setHighlightedSourceGameId] = useState<string | null>(null);

  // State for controlling expansion of fields and stages
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set());

  // State for tournament generator modal
  const [showTournamentModal, setShowTournamentModal] = useState(false);

  /**
   * Expand a field container to reveal its contents.
   */
  const expandField = useCallback((fieldId: string) => {
    setExpandedFieldIds((prev) => new Set([...prev, fieldId]));
  }, []);

  /**
   * Expand a stage container to reveal its games.
   */
  const expandStage = useCallback((stageId: string) => {
    setExpandedStageIds((prev) => new Set([...prev, stageId]));
  }, []);

  /**
   * Handle click on a dynamic reference badge in a game table.
   * Scrolls to the source game and highlights it.
   *
   * @param sourceGameId - ID of the source game to scroll to
   */
  const handleDynamicReferenceClick = useCallback(
    async (sourceGameId: string) => {
      // Set highlight state
      setHighlightedSourceGameId(sourceGameId);

      // Expand path and scroll to source game
      await scrollToGameWithExpansion(sourceGameId, nodes, expandField, expandStage, true);

      // Auto-clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedSourceGameId(null);
      }, 3000);
    },
    [nodes, expandField, expandStage]
  );

  /**
   * Handle adding a new global team to a specific group.
   */
  const handleAddGlobalTeam = useCallback((groupId: string) => {
    addGlobalTeam(undefined, groupId);
  }, [addGlobalTeam]);

  /**
   * Handle adding a new global team group.
   */
  const handleAddGlobalTeamGroup = useCallback(() => {
    addGlobalTeamGroup();
  }, [addGlobalTeamGroup]);

  /**
   * Handle adding a new field container.
   * Called from ListCanvas inline Add Field button.
   */
  const handleAddFieldContainer = useCallback(() => {
    addFieldNode({}, true); // Include default stage
  }, [addFieldNode]);

  /**
   * Handle adding a new stage container inside a field.
   * Called from FieldSection inline Add Stage button.
   */
  const handleAddStage = useCallback(
    (fieldId: string) => {
      addStageNode(fieldId);
    },
    [addStageNode]
  );

  /**
   * Handle import from JSON.
   */
  const handleImport = useCallback(
    (json: unknown) => {
      // Validate JSON format
      const errors = validateScheduleJson(json);
      if (errors.length > 0) {
        alert(`Invalid JSON format:\n${errors.join('\n')}`);
        return;
      }

      // Import the schedule
      const result = importFromScheduleJson(json);

      if (!result.success || !result.state) {
        alert(`Import failed:\n${result.errors.join('\n')}`);
        return;
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }

      importState(result.state);
    },
    [importState]
  );

  /**
   * Handle export to JSON.
   */
  const handleExport = useCallback(() => {
    const state = exportState();

    // Validate before export
    const errors = validateForExport(state);
    if (errors.length > 0) {
      const proceed = window.confirm(
        `The following issues were found:\n\n${errors.join('\n')}\n\nExport anyway?`
      );
      if (!proceed) return;
    }

    downloadFlowchartAsJson(state);
  }, [exportState]);

  /**
   * Handle clear all.
   */
  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  /**
   * Handle updating node data.
   */
  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<GameNodeData>) => {
      updateNode(nodeId, data);
    },
    [updateNode]
  );

  /**
   * Handle updating a global team.
   */
  const handleUpdateGlobalTeam = useCallback(
    (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => {
      updateGlobalTeam(teamId, data);
    },
    [updateGlobalTeam]
  );

  /**
   * Handle deleting a global team.
   */
  const handleDeleteGlobalTeam = useCallback(
    (teamId: string) => {
      deleteGlobalTeam(teamId);
    },
    [deleteGlobalTeam]
  );

  /**
   * Handle reordering a global team.
   */
  const handleReorderGlobalTeam = useCallback(
    (teamId: string, direction: 'up' | 'down') => {
      reorderGlobalTeam(teamId, direction);
    },
    [reorderGlobalTeam]
  );

  /**
   * Handle assigning a team to a game.
   */
  const handleAssignTeam = useCallback(
    (gameId: string, teamId: string, slot: 'home' | 'away') => {
      assignTeamToGame(gameId, teamId, slot);
    },
    [assignTeamToGame]
  );

  /**
   * Handle deleting a node.
   */
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNode(nodeId);
    },
    [deleteNode]
  );

  /**
   * Handle selecting a node.
   */
  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      selectNode(nodeId);
    },
    [selectNode]
  );

  /**
   * Create GameToGameEdge connections for placement stages.
   *
   * Maps standard progression patterns:
   * - Semifinals: Group winners → semifinals (crossover pattern)
   * - Finals: Semifinal winners → final
   * - 3rd Place: Semifinal losers → 3rd place match
   *
   * Returns an array of edge specifications to be added via addBulkGameToGameEdges.
   */
  const createPlacementEdges = useCallback(
    (
      targetGames: GameNode[],
      sourceGames: GameNode[],
      config: StageNodeData['progressionConfig']
    ): Array<{
      sourceGameId: string;
      outputType: 'winner' | 'loser';
      targetGameId: string;
      targetSlot: 'home' | 'away';
    }> => {
      const edgesToAdd: Array<{
        sourceGameId: string;
        outputType: 'winner' | 'loser';
        targetGameId: string;
        targetSlot: 'home' | 'away';
      }> = [];

      if (!config || config.mode !== 'placement') {
        return edgesToAdd;
      }

      const { positions, format } = config;

      // Pattern matching based on game standings
      const findGameByStanding = (games: GameNode[], pattern: string): GameNode | undefined => {
        return games.find(g => g.data.standing === pattern);
      };

      try {
        if (positions === 4 && format === 'single_elimination') {
          // 4-team bracket: SF1, SF2, Final, 3rd Place
          const sf1 = findGameByStanding(targetGames, 'SF1');
          const sf2 = findGameByStanding(targetGames, 'SF2');
          const final = findGameByStanding(targetGames, 'Final');
          const thirdPlace = findGameByStanding(targetGames, '3rd Place');

          // Check if all 4 games are in targetGames (single stage with all games)
          const allGamesInTarget = !!(sf1 && sf2 && final && thirdPlace);

          console.log('[createPlacementEdges] 4-team bracket:', {
            allGamesInTarget,
            sf1: sf1?.id,
            sf2: sf2?.id,
            final: final?.id,
            thirdPlace: thirdPlace?.id,
            sourceGamesCount: sourceGames.length,
            targetGamesCount: targetGames.length
          });

          if (allGamesInTarget) {
            // All games in one stage - create both source edges and internal edges
            if (sourceGames.length > 0) {
              // Map group stage games to semifinals
              if (sourceGames.length >= 6) {
                // Split groups (e.g., 2 groups × 3 games each)
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[3].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[2].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[5].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'away' });
              } else if (sourceGames.length >= 3) {
                // Single group (3 games for all teams)
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[2].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'home' });
                if (sourceGames.length >= 4) {
                  edgesToAdd.push({ sourceGameId: sourceGames[3].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'away' });
                } else {
                  edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'away' });
                }
              } else if (sourceGames.length >= 2) {
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'away' });
              }
            }

            // Create internal stage connections: SF1/SF2 → Final/3rd Place
            console.log('[createPlacementEdges] Creating internal edges SF→Final/3rd');
            console.log('  - SF1 winner → Final home:', sf1.id, '→', final.id);
            edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
            console.log('  - SF2 winner → Final away:', sf2.id, '→', final.id);
            edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
            console.log('  - SF1 loser → 3rd Place home:', sf1.id, '→', thirdPlace.id);
            edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'home' });
            console.log('  - SF2 loser → 3rd Place away:', sf2.id, '→', thirdPlace.id);
            edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'away' });
            console.log('[createPlacementEdges] Internal edges collected');
          } else {
            // Games split across stages - only create edges from sourceGames
            if (sf1 && sf2 && sourceGames.length > 0) {
              if (sourceGames.length >= 6) {
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[3].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[2].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[5].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'away' });
              } else if (sourceGames.length >= 3) {
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[2].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'home' });
                if (sourceGames.length >= 4) {
                  edgesToAdd.push({ sourceGameId: sourceGames[3].id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'away' });
                } else {
                  edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'away' });
                }
              } else if (sourceGames.length >= 2) {
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
                edgesToAdd.push({ sourceGameId: sourceGames[0].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceGames[1].id, outputType: 'loser', targetGameId: sf2.id, targetSlot: 'away' });
              }
            }

            // If final/3rd place exist in this stage, connect from previous stage SFs
            const sourceSF1 = findGameByStanding(sourceGames, 'SF1');
            const sourceSF2 = findGameByStanding(sourceGames, 'SF2');

            if (sourceSF1 && sourceSF2) {
              if (final) {
                edgesToAdd.push({ sourceGameId: sourceSF1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceSF2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
              }
              if (thirdPlace) {
                edgesToAdd.push({ sourceGameId: sourceSF1.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'home' });
                edgesToAdd.push({ sourceGameId: sourceSF2.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'away' });
              }
            }
          }
        } else if (positions === 2 && format === 'single_elimination') {
          // 2-position bracket: Just a final
          const final = findGameByStanding(targetGames, 'Final');

          // Map semifinal winners to final
          if (sourceGames.length >= 2 && final) {
            // Assume source games are semifinals
            const sf1 = sourceGames[sourceGames.length - 2]; // Second-to-last game
            const sf2 = sourceGames[sourceGames.length - 1]; // Last game

            edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
          }
        } else if (positions === 8 && format === 'single_elimination') {
          // 8-team bracket: QF1-4, SF1-2, Final, 3rd Place
          const qf1 = findGameByStanding(targetGames, 'QF1');
          const qf2 = findGameByStanding(targetGames, 'QF2');
          const qf3 = findGameByStanding(targetGames, 'QF3');
          const qf4 = findGameByStanding(targetGames, 'QF4');
          const sf1 = findGameByStanding(targetGames, 'SF1');
          const sf2 = findGameByStanding(targetGames, 'SF2');
          const final = findGameByStanding(targetGames, 'Final');
          const thirdPlace = findGameByStanding(targetGames, '3rd Place');

          // Quarterfinal winners → Semifinals
          if (qf1 && qf2 && sf1) {
            edgesToAdd.push({ sourceGameId: qf1.id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: qf2.id, outputType: 'winner', targetGameId: sf1.id, targetSlot: 'away' });
          }
          if (qf3 && qf4 && sf2) {
            edgesToAdd.push({ sourceGameId: qf3.id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: qf4.id, outputType: 'winner', targetGameId: sf2.id, targetSlot: 'away' });
          }

          // Semifinal winners → Final
          if (sf1 && sf2 && final) {
            edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
          }

          // Semifinal losers → 3rd Place
          if (sf1 && sf2 && thirdPlace) {
            edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'away' });
          }
        } else if (positions === 4 && format === 'crossover') {
          // Crossover format: CO1 (1v4), CO2 (2v3), Final, 3rd Place
          const co1 = findGameByStanding(targetGames, 'CO1');
          const co2 = findGameByStanding(targetGames, 'CO2');
          const final = findGameByStanding(targetGames, 'Final');
          const thirdPlace = findGameByStanding(targetGames, '3rd Place');

          // Crossover winners → Final
          if (co1 && co2 && final) {
            edgesToAdd.push({ sourceGameId: co1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: co2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
          }

          // Crossover losers → 3rd Place
          if (co1 && co2 && thirdPlace) {
            edgesToAdd.push({ sourceGameId: co1.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'home' });
            edgesToAdd.push({ sourceGameId: co2.id, outputType: 'loser', targetGameId: thirdPlace.id, targetSlot: 'away' });
          }
        }
      } catch (error) {
        console.error('Error creating placement edges:', error);
      }

      return edgesToAdd;
    },
    []
  );

  /**
   * Auto-assign teams to tournament games based on structure.
   *
   * For round robin stages: Assign teams sequentially to games
   * For placement stages: Create GameToGameEdge connections for winner/loser progression
   * For split field assignments: Group A gets first half of teams, Group B gets second half
   */
  const assignTeamsToTournament = useCallback(
    (structure: TournamentStructure, teams: GlobalTeam[]) => {
      // Get all stages sorted by order
      const stages = [...structure.stages].sort((a, b) => a.data.order - b.data.order);

      // Group stages by their order (for parallel execution like split groups)
      const stagesByOrder = new Map<number, StageNode[]>();
      stages.forEach(stage => {
        const order = stage.data.order;
        if (!stagesByOrder.has(order)) {
          stagesByOrder.set(order, []);
        }
        stagesByOrder.get(order)!.push(stage);
      });

      // Track previous stage games for progression mapping (per order)
      let previousOrderGames: GameNode[] = [];

      // Process each stage group
      stagesByOrder.forEach((parallelStages) => {
        // Check if this is a split field assignment (multiple stages at same order)
        const isSplitField = parallelStages.length > 1;

        // Collect games from this order
        const currentOrderGames: GameNode[] = [];

        parallelStages.forEach((stage, stageIndex) => {
          const stageData = stage.data;

          // Get games for this stage, sorted by standing
          const stageGames = structure.games
            .filter(game => game.parentId === stage.id)
            .sort((a, b) => {
              const aNum = parseInt(a.data.standing.replace(/\D/g, '')) || 0;
              const bNum = parseInt(b.data.standing.replace(/\D/g, '')) || 0;
              return aNum - bNum;
            });

          if (stageGames.length === 0) {
            return; // No games to assign
          }

          // Process based on progression mode
          if (stageData.progressionMode === 'round_robin') {
            // Assign teams directly to games
            let stageTeams: GlobalTeam[];
            if (isSplitField) {
              // Split teams across stages (Group A gets first half, Group B gets second half, etc.)
              const teamsPerGroup = Math.ceil(teams.length / parallelStages.length);
              const startIndex = stageIndex * teamsPerGroup;
              const endIndex = Math.min(startIndex + teamsPerGroup, teams.length);
              stageTeams = teams.slice(startIndex, endIndex);
            } else {
              // Use all teams for this stage
              stageTeams = teams;
            }

            // Assign teams to games using round robin pattern
            // For each game, assign sequential team pairs
            let teamIndex = 0;
            stageGames.forEach((game) => {
              if (teamIndex < stageTeams.length - 1) {
                // Assign home team
                assignTeamToGame(game.id, stageTeams[teamIndex].id, 'home');
                // Assign away team
                assignTeamToGame(game.id, stageTeams[teamIndex + 1].id, 'away');

                // Move to next pair, wrapping around if needed
                teamIndex += 2;
                if (teamIndex >= stageTeams.length) {
                  teamIndex = 0;
                }
              }
            });

            // Track these games for next order
            currentOrderGames.push(...stageGames);
          } else if (stageData.progressionMode === 'placement') {
            // Create GameToGameEdge connections for placement stages
            const edgesToAdd = createPlacementEdges(
              stageGames,
              previousOrderGames,
              stageData.progressionConfig
            );

            console.log('[assignTeamsToTournament] Collected', edgesToAdd.length, 'edges for stage', stageData.name);

            // Add all edges for this stage in bulk
            if (edgesToAdd.length > 0) {
              console.log('[assignTeamsToTournament] Adding edges in bulk:', edgesToAdd);
              addBulkGameToGameEdges(edgesToAdd);
            }

            // Track these games for next order
            currentOrderGames.push(...stageGames);
          }
        });

        // Update previous order games for next iteration
        previousOrderGames = currentOrderGames;
      });
    },
    [assignTeamToGame, addBulkGameToGameEdges, createPlacementEdges]
  );

  /**
   * Handle tournament generation from template.
   */
  const handleGenerateTournament = useCallback(
    async (config: TournamentGenerationConfig & { generateTeams: boolean; autoAssignTeams: boolean }) => {
      try {
        let teamsToUse = globalTeams;

        // Generate teams if requested
        if (config.generateTeams) {
          const teamCount = config.template.teamCount.exact || config.template.teamCount.min;

          // Add a group if none exists
          let groupId: string | null = null;
          if (globalTeamGroups.length === 0) {
            const newGroup = addGlobalTeamGroup('Tournament Teams');
            groupId = newGroup.id;
          } else {
            groupId = globalTeamGroups[0].id;
          }

          // Generate teams and collect them
          const newTeams: GlobalTeam[] = [];
          for (let i = 0; i < teamCount; i++) {
            const team = addGlobalTeam(`Team ${i + 1}`, groupId);
            // Assign a distinct color to each team
            updateGlobalTeam(team.id, { color: getTeamColor(i) });
            newTeams.push({ ...team, color: getTeamColor(i) });
          }

          // Use the newly created teams
          teamsToUse = [...globalTeams, ...newTeams];
        }

        const structure = generateTournament(teamsToUse, config);
        addBulkTournament(structure);

        // Auto-assign teams if requested
        if (config.autoAssignTeams && teamsToUse.length > 0) {
          setTimeout(() => {
            console.log('[handleGenerateTournament] Calling assignTeamsToTournament with', structure.games.length, 'games');
            assignTeamsToTournament(structure, teamsToUse);

            // Log edges state after assignment
            setTimeout(() => {
              console.log('[handleGenerateTournament] Inspecting edges state after assignment...');
              console.log('[handleGenerateTournament] Total edges in state:', edges.length);
              console.log('[handleGenerateTournament] All edges:', edges);

              // Find playoff games
              const playoffGames = nodes.filter(n =>
                n.type === 'game' &&
                ['SF1', 'SF2', 'Final', '3rd Place'].includes(n.data.standing)
              );
              console.log('[handleGenerateTournament] Playoff games:', playoffGames.map(g => ({ id: g.id, standing: g.data.standing, homeTeamId: g.data.homeTeamId, awayTeamId: g.data.awayTeamId })));

              // Find edges targeting playoff games
              const playoffGameIds = playoffGames.map(g => g.id);
              const playoffEdges = edges.filter(e =>
                e.type === 'game-to-game' && playoffGameIds.includes(e.target)
              );
              console.log('[handleGenerateTournament] Edges targeting playoff games:', playoffEdges);
            }, 100);
          }, 500);  // Increased timeout to ensure nodes are in state
        }
      } catch (error) {
        console.error('Failed to generate tournament:', error);
      }
    },
    [globalTeams, globalTeamGroups, addBulkTournament, addGlobalTeam, addGlobalTeamGroup, updateGlobalTeam, assignTeamsToTournament, edges, nodes]
  );

  // Calculate if export is available
  const canExport = useMemo(() => {
    return nodes.some((n) => n.type === 'game') && fields.length > 0;
  }, [nodes, fields]);

  // Check if there are any nodes
  const hasNodes = nodes.length > 0;


  return (
    <Container fluid className="list-designer-app">
      {/* Combined Header and Toolbar */}
      <Row className="list-designer-app__header align-items-center mb-3">
        <Col className="d-flex align-items-center">
          <div className="me-auto">
            <h1 className="h4 mb-0">Gameday Designer</h1>
            <p className="text-muted small mb-0">List-based editor for tournament schedules</p>
          </div>
          <Button
            variant="outline-primary"
            onClick={() => setShowTournamentModal(true)}
            className="me-2"
            title="Generate tournament structure"
          >
            <i className="bi bi-trophy me-1"></i>
            Generate Tournament
          </Button>
          <FlowToolbar
            onImport={handleImport}
            onExport={handleExport}
            onClearAll={handleClearAll}
            hasNodes={hasNodes}
            canExport={canExport}
          />
        </Col>
      </Row>

      {/* Status Bar - Validation summary */}
      <Row className="list-designer-app__status-bar">
        <Col>
          <div className="d-flex align-items-center gap-3 py-2 px-3 bg-light border-top border-bottom">
            {validation.isValid && validation.warnings.length === 0 ? (
              <span className="text-success">
                <i className="bi bi-check-circle-fill me-2"></i>
                Valid
              </span>
            ) : (
              <>
                {validation.errors.length > 0 && (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Popover id="errors-popover">
                        <Popover.Header as="h3">
                          {validation.errors.length} Error{validation.errors.length !== 1 ? 's' : ''}
                        </Popover.Header>
                        <Popover.Body className="p-0">
                          <ListGroup variant="flush">
                            {validation.errors.map((error) => (
                              <ListGroup.Item key={error.id} variant="danger" className="small">
                                {error.message}
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Popover.Body>
                      </Popover>
                    }
                  >
                    <span className="text-danger" style={{ cursor: 'help' }}>
                      <i className="bi bi-x-circle-fill me-1"></i>
                      {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
                    </span>
                  </OverlayTrigger>
                )}
                {validation.warnings.length > 0 && (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Popover id="warnings-popover">
                        <Popover.Header as="h3">
                          {validation.warnings.length} Warning{validation.warnings.length !== 1 ? 's' : ''}
                        </Popover.Header>
                        <Popover.Body className="p-0">
                          <ListGroup variant="flush">
                            {validation.warnings.map((warning) => (
                              <ListGroup.Item key={warning.id} variant="warning" className="small">
                                {warning.message}
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Popover.Body>
                      </Popover>
                    }
                  >
                    <span className="text-warning" style={{ cursor: 'help' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
                    </span>
                  </OverlayTrigger>
                )}
              </>
            )}
            <span className="text-muted small ms-auto">
              {nodes.filter((n) => n.type === 'field').length} fields |{' '}
              {nodes.filter((n) => n.type === 'stage').length} stages |{' '}
              {globalTeams.length} teams |{' '}
              {nodes.filter((n) => n.type === 'game').length} games
            </span>
          </div>
        </Col>
      </Row>

      {/* Main content */}
      <div className="list-designer-app__content">
        <ListCanvas
          nodes={nodes}
          edges={edges}
          globalTeams={globalTeams}
          globalTeamGroups={globalTeamGroups}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onAddField={handleAddFieldContainer}
          onAddStage={handleAddStage}
          onSelectNode={handleSelectNode}
          selectedNodeId={selectedNode?.id ?? null}
          onAddGlobalTeam={handleAddGlobalTeam}
          onUpdateGlobalTeam={handleUpdateGlobalTeam}
          onDeleteGlobalTeam={handleDeleteGlobalTeam}
          onReorderGlobalTeam={handleReorderGlobalTeam}
          onAddGlobalTeamGroup={handleAddGlobalTeamGroup}
          onUpdateGlobalTeamGroup={updateGlobalTeamGroup}
          onDeleteGlobalTeamGroup={deleteGlobalTeamGroup}
          onReorderGlobalTeamGroup={reorderGlobalTeamGroup}
          getTeamUsage={getTeamUsage}
          onAssignTeam={handleAssignTeam}
          onAddGame={addGameNodeInStage}
          highlightedSourceGameId={highlightedSourceGameId}
          onDynamicReferenceClick={handleDynamicReferenceClick}
          onAddGameToGameEdge={addGameToGameEdge}
          onRemoveGameToGameEdge={removeGameToGameEdge}
          expandedFieldIds={expandedFieldIds}
          expandedStageIds={expandedStageIds}
        />
      </div>

      {/* Tournament Generator Modal */}
      <TournamentGeneratorModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        teams={globalTeams}
        onGenerate={handleGenerateTournament}
      />
    </Container>
  );
};

export default ListDesignerApp;
