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
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { ICONS } from '../utils/iconConstants';
import type { ValidationError, ValidationWarning } from '../types/designer';

import './ListDesignerApp.css';


/**
 * ListDesignerApp component.
 */
const ListDesignerApp: React.FC = () => {
  const { t } = useTypedTranslation(['ui', 'validation']);
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

  /**
   * Helper to translate error/warning message.
   */
  const getMessage = (item: ValidationError | ValidationWarning) => {
    if (item.messageKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return t(`validation:${item.messageKey}` as any, item.messageParams);
    }
    return item.message;
  };

  /**
   * Helper to determine highlight type from error type.
   */
  const getHighlightType = (errorType: string): HighlightedElement['type'] => {
    if (errorType.includes('stage')) return 'stage';
    if (errorType.includes('field')) return 'field';
    if (errorType.includes('team')) return 'team';
    return 'game';
  };

  const {
    highlightedElement,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasNodes,
  } = ui;

  const {
    expandField,
    expandStage,
    handleHighlightElement,
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
            title={t('ui:tooltip.generateTournament')}
          >
            <i className={`bi ${ICONS.TOURNAMENT} me-2`}></i>
            <span className="btn-label-adaptive">{t('ui:button.generateTournament')}</span>
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
                {t('validation:scheduleValid')}
              </span>
            ) : (
              <>
                {validation.errors.length > 0 && (
                  <OverlayTrigger
                    trigger="click"
                    rootClose
                    placement="bottom"
                    overlay={
                      <Popover id="errors-popover">
                        <Popover.Header as="h3">
                          {t('validation:errorCount', { count: validation.errors.length })}
                        </Popover.Header>
                        <Popover.Body className="p-0">
                          <ListGroup variant="flush">
                            {validation.errors.map((error) => (
                              <ListGroup.Item 
                                key={error.id} 
                                variant="danger" 
                                action
                                onClick={() => {
                                  // @ts-ignore
                                  const nodeId = error.affectedNodes?.[0] || error.affectedSlots?.[0];
                                  if (nodeId) handleHighlightElement(nodeId, getHighlightType(error.type));
                                }}
                                className="small"
                              >
                                {getMessage(error)}
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Popover.Body>
                      </Popover>
                    }
                  >
                    <span className="text-danger" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-x-circle-fill me-1"></i>
                      {t('validation:errorCount', { count: validation.errors.length })}
                    </span>
                  </OverlayTrigger>
                )}
                {validation.warnings.length > 0 && (
                  <OverlayTrigger
                    trigger="click"
                    rootClose
                    placement="bottom"
                    overlay={
                      <Popover id="warnings-popover">
                        <Popover.Header as="h3">
                          {t('validation:warningCount', { count: validation.warnings.length })}
                        </Popover.Header>
                        <Popover.Body className="p-0">
                          <ListGroup variant="flush">
                            {validation.warnings.map((warning) => (
                              <ListGroup.Item 
                                key={warning.id} 
                                variant="warning" 
                                action
                                onClick={() => {
                                  // @ts-ignore
                                  const nodeId = warning.affectedNodes?.[0] || warning.affectedSlots?.[0];
                                  if (nodeId) handleHighlightElement(nodeId, getHighlightType(warning.type));
                                }}
                                className="small"
                              >
                                {getMessage(warning)}
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Popover.Body>
                      </Popover>
                    }
                  >
                    <span className="text-warning" style={{ cursor: 'pointer' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {t('validation:warningCount', { count: validation.warnings.length })}
                    </span>
                  </OverlayTrigger>
                )}
              </>
            )}
            <span className="text-muted small ms-auto">
              {nodes.filter((n) => n.type === 'field').length} {t('ui:label.fields')} |{' '}
              {nodes.filter((n) => n.type === 'stage').length} {t('ui:label.stages')} |{' '}
              {globalTeams.length} {t('ui:label.teams')} |{' '}
              {nodes.filter((n) => n.type === 'game').length} {t('ui:label.games')}
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
          highlightedElement={highlightedElement}
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