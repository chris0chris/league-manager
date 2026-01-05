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
import {
  generateTeamsForTournament,
  assignTeamsToTournamentGames,
} from '../utils/teamAssignment';
import {
  HIGHLIGHT_AUTO_CLEAR_DELAY,
  TOURNAMENT_GENERATION_STATE_DELAY,
  DEFAULT_TOURNAMENT_GROUP_NAME,
} from '../utils/tournamentConstants';
import type { GameNodeData, GlobalTeam } from '../types/flowchart';
import type { TournamentGenerationConfig } from '../types/tournament';

import './ListDesignerApp.css';


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

      // Auto-clear highlight after delay
      setTimeout(() => {
        setHighlightedSourceGameId(null);
      }, HIGHLIGHT_AUTO_CLEAR_DELAY);
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
   * Auto-assign teams to tournament games based on structure.
   *
   * Adapter that delegates to the pure business logic utility and executes
   * the returned operations using hooks.
   *
   * For round robin stages: Assigns teams sequentially to games
   * For placement stages: Creates GameToGameEdge connections for winner/loser progression
   * For split field assignments: Group A gets first half of teams, Group B gets second half
   */
  const assignTeamsToTournament = useCallback(
    (structure: TournamentStructure, teams: GlobalTeam[]) => {
      // Get operations from pure business logic
      const operations = assignTeamsToTournamentGames(structure, teams);

      // Execute operations using hooks
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
            const newGroup = addGlobalTeamGroup(DEFAULT_TOURNAMENT_GROUP_NAME);
            groupId = newGroup.id;
          } else {
            groupId = globalTeamGroups[0].id;
          }

          // Generate teams using utility
          const teamData = generateTeamsForTournament(teamCount);
          const newTeams: GlobalTeam[] = teamData.map((data) => {
            const team = addGlobalTeam(data.label, groupId);
            updateGlobalTeam(team.id, { color: data.color });
            return { ...team, color: data.color };
          });

          // Use the newly created teams
          teamsToUse = [...globalTeams, ...newTeams];
        }

        const structure = generateTournament(teamsToUse, config);
        addBulkTournament(structure);

        // Auto-assign teams if requested
        if (config.autoAssignTeams && teamsToUse.length > 0) {
          setTimeout(() => {
            assignTeamsToTournament(structure, teamsToUse);
          }, TOURNAMENT_GENERATION_STATE_DELAY);
        }
      } catch (error) {
        console.error('Failed to generate tournament:', error);
      }
    },
    [globalTeams, globalTeamGroups, addBulkTournament, addGlobalTeam, addGlobalTeamGroup, updateGlobalTeam, assignTeamsToTournament]
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
