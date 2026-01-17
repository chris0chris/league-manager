/**
 * ListDesignerApp Component
 *
 * Main application component for the list-based visual editor
 * for creating flag football tournament schedules.
 *
 * Replaces FlowDesignerApp with a table/list-based UI instead of flowchart.
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Popover, ListGroup, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

import ListCanvas from './ListCanvas';
import FlowToolbar from './FlowToolbar';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import NotificationToast from './NotificationToast';
import GamedayMetadataAccordion from './GamedayMetadataAccordion';
import { useDesignerController } from '../hooks/useDesignerController';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { ICONS } from '../utils/iconConstants';
import { gamedayApi } from '../api/gamedayApi';
import type { ValidationError, ValidationWarning } from '../types/designer';

import './ListDesignerApp.css';


/**
 * ListDesignerApp component.
 */
const ListDesignerApp: React.FC = () => {
  const { t } = useTypedTranslation(['ui', 'validation']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const {
    metadata,
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
    addStageToGameEdge,
    removeEdgeFromSlot,
    addGameNodeInStage,
    addNotification,
    importState,
    updateMetadata,
  } = useDesignerController();

  useEffect(() => {
    if (id) {
      loadGameday(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadGameday = async (gamedayId: number) => {
    setLoading(true);
    try {
      const gameday = await gamedayApi.getGameday(gamedayId);
      if (gameday.designer_data) {
        importState({
          metadata: gameday,
          nodes: [], 
          edges: [],
          fields: gameday.designer_data.fields.map(f => ({ id: f.id, name: f.name, order: f.order })),
          globalTeams: [],
          globalTeamGroups: []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as unknown as any);
      } else {
        // Just set metadata for new gameday
        updateMetadata(gameday);
      }
    } catch (error) {
      console.error('Failed to load gameday', error);
      addNotification('Failed to load gameday.', 'danger', 'Error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to translate error/warning message.
   */
  const getMessage = (item: ValidationError | ValidationWarning) => {
    if (item.messageKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return t(`validation:${item.messageKey}` as unknown as any, item.messageParams);
    }
    return item.message;
  };

  /**
   * Helper to determine highlight type from error type.
   */
  const getHighlightType = (errorType: string): HighlightedElement['type'] => {
    if (errorType === 'field_overlap' || errorType === 'team_overlap') return 'game';
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

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="list-designer-app">
      {/* Combined Header and Toolbar */}
      <Row className="list-designer-app__header align-items-center mb-3">
        <Col className="d-flex align-items-center">
          <Button 
            variant="link" 
            onClick={() => navigate('/')} 
            className="p-0 me-3 text-dark"
            title="Back to Dashboard"
          >
            <i className="bi bi-arrow-left fs-4"></i>
          </Button>
          <div className="me-auto">
            <h1 className="h4 mb-0">Gameday Designer</h1>
            <p className="text-muted small mb-0">
              {metadata?.name || 'Untitled Gameday'} - {metadata?.date}
            </p>
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

      {/* Gameday Metadata Accordion */}
      <GamedayMetadataAccordion 
        metadata={metadata} 
        onUpdate={updateMetadata} 
        defaultActiveKey={!hasNodes ? '0' : undefined}
      />

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
                                  // @ts-expect-error error type mapping
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
                                  // @ts-expect-error error type mapping
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
          onAddStageToGameEdge={addStageToGameEdge}
          onRemoveEdgeFromSlot={removeEdgeFromSlot}
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