/**
 * ListDesignerApp Component
 *
 * Main application component for the list-based visual editor
 * for creating flag football tournament schedules.
 *
 * Replaces FlowDesignerApp with a table/list-based UI instead of flowchart.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Container, Row, Col, Button, OverlayTrigger, Popover, ListGroup, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

import ListCanvas from './ListCanvas';
import FlowToolbar from './FlowToolbar';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import PublishConfirmationModal from './modals/PublishConfirmationModal';
import GameResultModal from './modals/GameResultModal';
import NotificationToast from './NotificationToast';
import GamedayMetadataAccordion from './GamedayMetadataAccordion';
import { useFlowState } from '../hooks/useFlowState';
import { useDesignerController } from '../hooks/useDesignerController';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { useGamedayContext } from '../context/GamedayContext';
import { ICONS } from '../utils/iconConstants';
import { gamedayApi } from '../api/gamedayApi';
import type { 
  FlowValidationError as ValidationError, 
  FlowValidationWarning as ValidationWarning,
  HighlightedElement,
  GamedayMetadata,
  GameNode
} from '../types/flowchart';

import './ListDesignerApp.css';


/**
 * ListDesignerApp component.
 */
const ListDesignerApp: React.FC = () => {
  const { t } = useTypedTranslation(['ui', 'validation']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setGamedayName } = useGamedayContext();
  const [loading, setLoading] = useState(true);

  // Lock body scroll when designer is active to ensure internal scrolling works
  useEffect(() => {
    document.body.classList.add('designer-active');
    return () => document.body.classList.remove('designer-active');
  }, []);

  const flowState = useFlowState();
  const controller = useDesignerController(flowState);

  const {
    metadata,
    nodes,
    edges,
    fields,
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
    importState,
    updateMetadata,
    exportState,
  } = controller;

  const {
    highlightedElement,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasData,
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
    addNotification,
  } = handlers;

    // Only lock if we have a valid status explicitly NOT DRAFT

    const isLocked = Boolean(metadata?.status && metadata.status !== 'DRAFT');

    // Sync gameday name with global header
    useEffect(() => {
      if (metadata?.name) {
        setGamedayName(metadata.name);
      } else {
        setGamedayName('');
      }
      
      // Cleanup when leaving editor
      return () => setGamedayName('');
    }, [metadata?.name, setGamedayName]);

    const [showResultModal, setShowResultModal] = useState(false);

    const [showPublishModal, setShowPublishModal] = useState(false);

    const [activeGameId, setActiveGameId] = useState<string | null>(null);

  

    useEffect(() => {

      if (selectedNode?.type === 'game' && isLocked) {

        setActiveGameId(selectedNode.id);

        setShowResultModal(true);

      }

    }, [selectedNode, isLocked]);

  

    const activeGame = activeGameId ? nodes.find(n => n.id === activeGameId && n.type === 'game') : null;

  

    const handleSaveResult = async (resultData: { halftime_score: { home: number; away: number }; final_score: { home: number; away: number } }) => {

      if (!activeGameId) return;

      try {

        const updatedGame = await gamedayApi.updateGameResult(parseInt(activeGameId.replace('game-', '')), resultData);

        // Update local node state

              handleUpdateNode(activeGameId, {

                halftime_score: updatedGame.halftime_score,

                final_score: updatedGame.final_score,

                status: updatedGame.status,

              });

              addNotification(t('ui:notification.gameResultSaved'), 'success', t('ui:notification.title.success'));

              // If gameday status changed, we should reload metadata

              if (metadata && metadata.id) {

                const updatedGameday = await gamedayApi.getGameday(metadata.id);

                updateMetadata(updatedGameday);

              }

            } catch (error) {

              console.error('Failed to save game result', error);

              addNotification(t('ui:notification.saveResultFailed'), 'danger', t('ui:notification.title.error'));

            }

          };

        

          const lastSavedStateRef = useRef<string>('');

          const initialLoadRef = useRef<boolean>(true);

          const [isTransitioning, setIsTransitioning] = useState(false);

          const pauseAutoSaveUntilRef = useRef<number>(0);

        

          useEffect(() => {

            // Definitive block for auto-save during any transition or loading

            if (loading) return;

            if (isTransitioning) return;

        

            // Temporal lock to allow React state to settle after manual actions

            const now = Date.now();

            if (now < pauseAutoSaveUntilRef.current) return;

            

            // Skip initial load to prevent unnecessary save

            if (initialLoadRef.current) {

              if (metadata && metadata.id) {

                const initialState = exportState();

                lastSavedStateRef.current = JSON.stringify(initialState);

                initialLoadRef.current = false;

              }

              return;

            }

        

            const currentState = exportState();

            const currentStateStr = JSON.stringify(currentState);

            if (currentStateStr === lastSavedStateRef.current) return;

        

            const timer = setTimeout(async () => {

              // Execute the auto-save ONLY if we are still not transitioning and not locked

              if (metadata?.id && !isTransitioning && Date.now() >= pauseAutoSaveUntilRef.current) {

                try {

                  // Only send fields that exist in the backend model to avoid validation errors
                  const { 
                    name, date, start, format, address, season, league, status 
                  } = metadata;

                  await gamedayApi.patchGameday(metadata.id, {
                    name, date, start, format, address, season, league, status,
                    designer_data: {
                      ...metadata.designer_data,
                      nodes,
                      edges,
                      fields,
                      globalTeams,
                      globalTeamGroups
                    }
                  });

                  lastSavedStateRef.current = currentStateStr;

                } catch (error) {

                  console.error('Auto-save failed', error);

                  addNotification(t('ui:notification.autoSaveFailed'), 'warning', t('ui:notification.title.autoSave'));

                }

              }

            }, 1000); // Debounce for 1 second

        

            return () => clearTimeout(timer);

          }, [metadata, nodes, edges, fields, globalTeams, globalTeamGroups, loading, isTransitioning, addNotification, exportState, t]);

        

                    const handleUpdateMetadataWrapped = useCallback((data: Partial<GamedayMetadata>) => {

        

                      updateMetadata(data);

        

                    }, [updateMetadata]);

        

          const loadGameday = useCallback(async (gamedayId: number) => {

            setLoading(true);

            setIsTransitioning(true);

            try {

              const updatedGameday = await gamedayApi.getGameday(gamedayId);

              if (updatedGameday.designer_data?.nodes) {

                // Load full state if available

                importState({

                  metadata: updatedGameday,

                  nodes: updatedGameday.designer_data.nodes || [],

                  edges: updatedGameday.designer_data.edges || [],

                  fields: updatedGameday.designer_data.fields || [],

                  globalTeams: updatedGameday.designer_data.globalTeams || [],

                  globalTeamGroups: updatedGameday.designer_data.globalTeamGroups || []

                });

              } else if (updatedGameday.designer_data?.fields) {

                // Legacy load (only fields)

                importState({

                  metadata: updatedGameday,

                  nodes: [], 

                  edges: [],

                  fields: updatedGameday.designer_data.fields.map((f) => ({ id: f.id, name: f.name, order: f.order })),

                  globalTeams: [],

                  globalTeamGroups: []

                });

              } else {

                // Just set metadata for new gameday

                updateMetadata(updatedGameday);

              }

              // Critical: mark this state as already saved and pause auto-save

              pauseAutoSaveUntilRef.current = Date.now() + 2000;

              setTimeout(() => {

                lastSavedStateRef.current = JSON.stringify(exportState());

              }, 500);

            } catch (error) {

              console.error('Failed to load gameday', error);

              addNotification(t('ui:notification.loadGamedayFailed'), 'danger', t('ui:notification.title.error'));

              navigate('/');

            } finally {

              setLoading(false);

              setIsTransitioning(false);

            }

          }, [importState, updateMetadata, addNotification, navigate, exportState, t]);

        

          const hasLoadedRef = useRef(false);

          useEffect(() => {

            if (id && !hasLoadedRef.current) {

              hasLoadedRef.current = true;

              loadGameday(parseInt(id));

            }

          }, [id, loadGameday]);

        

          const handlePublishWrapped = useCallback(async () => {

            setShowPublishModal(true);

          }, []);

        

          const handleConfirmPublish = useCallback(async () => {

            setShowPublishModal(false);

            setIsTransitioning(true);

            pauseAutoSaveUntilRef.current = Date.now() + 5000; // Extra long pause for publish

            try {

              const updated = await gamedayApi.publish(metadata.id);

              

              // Update local state. 

              // First import nodes/edges/etc.

              if (updated.designer_data) {

                importState(updated.designer_data);

              }

              // Then explicitly update metadata from the top-level response

              // This ensures status is always correct and not shadowed by designer_data

              updateMetadata(updated);

              

              addNotification(t('ui:notification.publishSuccess'), 'success', t('ui:notification.title.success'));

              

              // Update the reference after a short delay to ensure we capture the new state

              setTimeout(() => {

                lastSavedStateRef.current = JSON.stringify(exportState());

              }, 1000);

            } catch (error) {

              console.error('Failed to publish gameday:', error);

              addNotification(t('ui:notification.publishFailed'), 'danger', t('ui:notification.title.error'));

            } finally {

              setIsTransitioning(false);

            }

          }, [metadata.id, updateMetadata, importState, addNotification, exportState, t]);

        

          const handleUnlockWrapped = useCallback(async () => {

            setIsTransitioning(true);

            pauseAutoSaveUntilRef.current = Date.now() + 5000; // Extra long pause for unlock

            try {

              const updated = await gamedayApi.patchGameday(metadata.id, { status: 'DRAFT' });

              

              // Update local state.

              if (updated.designer_data) {

                importState(updated.designer_data);

              }

              updateMetadata(updated);

              

              addNotification(t('ui:notification.unlockSuccess'), 'warning', t('ui:notification.title.success'));

              

              // Update the reference after a short delay to ensure we capture the new state

              setTimeout(() => {

                lastSavedStateRef.current = JSON.stringify(exportState());

              }, 1000);

            } catch (error) {

              console.error('Failed to unlock gameday:', error);

              addNotification(t('ui:notification.unlockFailed'), 'danger', t('ui:notification.title.error'));

            } finally {

              setIsTransitioning(false);

            }

          }, [metadata.id, updateMetadata, importState, addNotification, exportState, t]);

  /**
   * Helper to translate error/warning message.
   */
  const getMessage = (item: ValidationError | ValidationWarning) => {
    if (item.messageKey) {
      return t(`validation:${item.messageKey}` as const, item.messageParams);
    }
    return item.message;
  };

  /**
   * Helper to determine highlight type from error type.
   */
  const getHighlightType = (errorType: string): HighlightedElement['type'] => {
    if (errorType === 'field_overlap' || errorType === 'team_overlap' || errorType === 'no_games' || errorType === 'broken_progression') return 'game';
    if (errorType.includes('stage')) return 'stage';
    if (errorType.includes('field')) return 'field';
    if (errorType.includes('team')) return 'team';
    return 'game';
  };

  const handleDeleteGameday = async () => {
    if (metadata?.id) {
      // Redirect to dashboard with pending delete state
      // The dashboard will handle the 10s undo logic
      navigate('/', { state: { pendingDeleteId: metadata.id } });
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <div className="list-designer-app pt-2 h-100 overflow-hidden d-flex flex-column container-fluid">
      {/* Toolbar actions relocated to global header or kept below it */}
      <Row className="list-designer-app__header align-items-center mb-3">
        <Col className="d-flex align-items-center justify-content-end">
          <Button
            variant="outline-primary"
            onClick={() => setShowTournamentModal(true)}
            className="me-2 btn-adaptive"
            disabled={isLocked}
            title={t('ui:tooltip.generateTournament')}
          >
            <i className={`bi ${ICONS.TOURNAMENT} me-2`}></i>
            <span className="btn-label-adaptive">{t('ui:button.generateTournament')}</span>
          </Button>
          <FlowToolbar
            onImport={handleImport}
            onExport={handleExport}
            gamedayStatus={metadata?.status}
            onNotify={addNotification}
            canExport={canExport}
          />
        </Col>
      </Row>

      {/* Gameday Metadata Accordion */}
      <GamedayMetadataAccordion 
        metadata={metadata} 
        onUpdate={handleUpdateMetadataWrapped} 
        onPublish={handlePublishWrapped}
        onUnlock={handleUnlockWrapped}
        onClearAll={handleClearAll}
        onDelete={handleDeleteGameday}
        hasData={hasData}
        defaultActiveKey={!hasData ? '0' : undefined}
        readOnly={isLocked}
      />

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
          onNotify={addNotification}
          readOnly={isLocked}
        />
      </div>

      {/* Status Bar - Validation summary (Footer) */}
      <Row className="list-designer-app__status-bar">
        <Col>
          <div className="d-flex align-items-center gap-3 py-2 px-3 bg-light border-top shadow-sm">
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
                    placement="top"
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
                                  const nodeId = error.affectedNodes?.[0];
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
                    placement="top"
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
                                  const nodeId = warning.affectedNodes?.[0];
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

      {/* Tournament Generator Modal */}
      <TournamentGeneratorModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        teams={globalTeams}
        onGenerate={handleGenerateTournament}
      />

      {/* Publish Confirmation Modal */}
      <PublishConfirmationModal
        show={showPublishModal}
        onHide={() => setShowPublishModal(false)}
        onConfirm={handleConfirmPublish}
        validation={validation}
        onHighlight={handleHighlightElement}
      />

      {/* Global Notifications */}
      <NotificationToast 
        notifications={notifications} 
        onClose={dismissNotification} 
      />

      {/* Game Result Modal */}
      <GameResultModal
        show={showResultModal}
        onHide={() => {
          setShowResultModal(false);
          setActiveGameId(null);
          handleSelectNode(null);
        }}
        onSave={handleSaveResult}
        game={activeGame as GameNode}
        homeTeamName={activeGame ? (activeGame.data.homeTeamId ? globalTeams.find(t => t.id === activeGame.data.homeTeamId)?.label || 'Home' : 'Home') : 'Home'}
        awayTeamName={activeGame ? (activeGame.data.awayTeamId ? globalTeams.find(t => t.id === activeGame.data.awayTeamId)?.label || 'Away' : 'Away') : 'Away'}
      />
    </div>
  );
};

export default ListDesignerApp;