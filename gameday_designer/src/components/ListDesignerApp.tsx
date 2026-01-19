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
  const { 
    setGamedayName, 
    setOnGenerateTournament, 
    setToolbarProps, 
    setIsLocked: setGlobalIsLocked 
  } = useGamedayContext();
  const [loading, setLoading] = useState(true);

  // Lock body scroll when designer is active to ensure internal scrolling works
  useEffect(() => {
    document.body.classList.add('designer-active');
    return () => document.body.classList.remove('designer-active');
  }, []);

  const [showResultModal, setShowResultModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [metadataActiveKey, setMetadataActiveKey] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const lastSavedStateRef = useRef<string>('');
  const initialLoadRef = useRef<boolean>(true);
  const pauseAutoSaveUntilRef = useRef<number>(0);
  const [saveTrigger, setSaveTrigger] = useState(0);

  const triggerAutoSave = useCallback(() => {
    setSaveTrigger(prev => prev + 1);
  }, []);

  const flowState = useFlowState(undefined, triggerAutoSave);
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

  const {
    highlightedElement,
    expandedFieldIds,
    expandedStageIds,
    showTournamentModal,
    canExport,
    hasData,
  } = ui;

  const isLocked = Boolean(metadata?.status && metadata.status !== 'DRAFT');

  // Sync global context with editor state
  useEffect(() => {
    setOnGenerateTournament(() => () => setShowTournamentModal(true));
    setToolbarProps({
      onImport: handleImport,
      onExport: handleExport,
      gamedayStatus: metadata?.status,
      onNotify: addNotification,
      canExport
    });
    setGlobalIsLocked(isLocked);

    return () => {
      setOnGenerateTournament(null);
      setToolbarProps(null);
      setGlobalIsLocked(false);
    };
  }, [
    isLocked, 
    metadata?.status, 
    canExport, 
    handleImport, 
    handleExport, 
    addNotification, 
    setShowTournamentModal, 
    setOnGenerateTournament, 
    setToolbarProps, 
    setGlobalIsLocked
  ]);

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

  // Automatically expand metadata if gameday has no data
  useEffect(() => {
    if (!hasData && !loading) {
      setMetadataActiveKey('0');
    }
  }, [hasData, loading]);

  // Handle scroll to collapse metadata
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 50 && metadataActiveKey === '0') {
      setMetadataActiveKey(null);
    }
  }, [metadataActiveKey]);

  // Auto-save logic
  useEffect(() => {
    if (loading || isTransitioning) return;
    if (Date.now() < pauseAutoSaveUntilRef.current) return;

    const currentState = exportState();
    const currentStateStr = JSON.stringify(currentState);

    // Skip initial load
    if (initialLoadRef.current) {
      if (metadata && metadata.id) {
        lastSavedStateRef.current = currentStateStr;
        initialLoadRef.current = false;
      }
      return;
    }

    if (currentStateStr === lastSavedStateRef.current) return;

    const timer = setTimeout(async () => {
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
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [metadata, nodes, edges, fields, globalTeams, globalTeamGroups, loading, isTransitioning, addNotification, exportState, t, saveTrigger]);

  useEffect(() => {
    if (selectedNode?.type === 'game' && isLocked) {
      setActiveGameId(selectedNode.id);
      setShowResultModal(true);
    }
  }, [selectedNode, isLocked]);

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
      {/* Gameday Metadata Accordion */}
      <GamedayMetadataAccordion 
        metadata={metadata} 
        onUpdate={handleUpdateMetadataWrapped} 
        onPublish={handlePublishWrapped}
        onUnlock={handleUnlockWrapped}
        onClearAll={handleClearAll}
        onDelete={handleDeleteGameday}
        hasData={hasData}
        activeKey={metadataActiveKey}
        onSelect={setMetadataActiveKey}
        readOnly={isLocked}
        validation={validation}
        onHighlight={handleHighlightElement}
      />

      {/* Main content */}
      <div className="list-designer-app__content" onScroll={handleScroll}>
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