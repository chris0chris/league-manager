/**
 * ListDesignerApp Component
 *
 * Main application component for the list-based visual editor
 * for creating flag football tournament schedules.
 *
 * Replaces FlowDesignerApp with a table/list-based UI instead of flowchart.
 */

import React from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Popover, ListGroup } from 'react-bootstrap';

import ListCanvas from './ListCanvas';
import FlowToolbar from './FlowToolbar';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import NotificationToast from './NotificationToast';
import { useDesignerController } from '../hooks/useDesignerController';

import './ListDesignerApp.css';


/**
 * ListDesignerApp component.
 */
const ListDesignerApp: React.FC = () => {
  const {
    nodes,
    edges,
    globalTeams,
    globalTeamGroups,
    selectedNode,
    validation,
    notifications,
    ui,
    handlers,
    updateGlobalTeamGroup,
    deleteGlobalTeamGroup,
    reorderGlobalTeamGroup,
    getTeamUsage,
    addGameToGameEdge,
    removeGameToGameEdge,
    addGameNodeInStage,
    addNotification,
  } = useDesignerController();

  const {
    highlightedSourceGameId,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasNodes,
  } = ui;

  const {
    handleDynamicReferenceClick,
    handleImport,
    handleExport,
    handleClearAll,
    handleUpdateNode,
    handleDeleteNode,
    handleAddFieldContainer,
    handleAddStage,
    handleSelectNode,
    handleAddGlobalTeam,
    handleUpdateGlobalTeam,
    handleDeleteGlobalTeam,
    handleReorderGlobalTeam,
    handleAddGlobalTeamGroup,
    handleAssignTeam,
    handleGenerateTournament,
    setShowTournamentModal,
    dismissNotification,
  } = handlers;

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
            className="me-2 btn-adaptive"
            title="Generate tournament structure"
          >
            <i className={`bi ${ICONS.TOURNAMENT} me-1`}></i>
            <span className="btn-label-adaptive">Generate Tournament</span>
          </Button>
          <FlowToolbar
            onImport={handleImport}
            onExport={handleExport}
            onClearAll={handleClearAll}
            onNotify={addNotification}
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
                    placement="bottom"
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
                    placement="bottom"
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

      {/* Global Notifications */}
      <NotificationToast 
        notifications={notifications} 
        onClose={dismissNotification} 
      />
    </Container>
  );
};

export default ListDesignerApp;