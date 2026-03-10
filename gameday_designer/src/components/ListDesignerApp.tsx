import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Accordion } from 'react-bootstrap';
import ListCanvas from './ListCanvas';
import GamedayMetadataAccordion from './GamedayMetadataAccordion';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import PublishConfirmationModal from './modals/PublishConfirmationModal';
import NotificationToast from './NotificationToast';
import GameResultModal from './modals/GameResultModal';
import TeamSelectionModal from './modals/TeamSelectionModal';
import { gamedayApi } from '../api/gamedayApi';
import { useGamedayContext } from '../context/GamedayContext';
import { useDesignerController } from '../hooks/useDesignerController';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { GamedayMetadata, GameNode } from '../types';
import { FlowState } from '../types/flowchart';
import './ListDesignerApp.css';

import { useFlowState } from '../hooks/useFlowState';
import { exportToStructuredTemplate } from '../utils/flowchartExport';
import { formatTeamReference } from '../utils/teamReference';

const ListDesignerApp: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTypedTranslation(['ui', 'domain', 'modal', 'validation', 'error']);
  
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [metadataActiveKey, setMetadataActiveKey] = useState<string | null>('0');
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [activeTeamGroupId, setActiveTeamGroupId] = useState<string | null>(null);
  const [activeReplaceTeamId, setActiveReplaceTeamId] = useState<string | null>(null);

  const flowState = useFlowState();
  const controller = useDesignerController(flowState, () => setMetadataActiveKey('0'));
  
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
    undo,
    redo,
    canUndo,
    canRedo,
    stats,
    addOfficialsGroup,
  } = controller;

  const { 
    setGamedayName, 
    setOnGenerateTournament, 
    setToolbarProps,
    setIsLocked: setContextLocked,
    resultsMode,
    setResultsMode,
    gameResults,
    setGameResults
  } = useGamedayContext();

  const {
    handleHighlightElement,
    handleImport,
    handleExport,
    handleClearAll,
    handleUpdateNode,
    handleUpdateGlobalTeam,
    handleDeleteGlobalTeam,
    handleReplaceGlobalTeam,
    handleReorderGlobalTeam,
    handleAssignTeam,
    handleConnectTeam,
    handleSwapTeams,
    handleDeleteNode,
    handleSelectNode,
    handleGenerateTournament,
    handleAddGlobalTeam,
    handleAddGlobalTeamGroup,
    handleAddFieldContainer,
    handleAddStage,
    dismissNotification,
    addNotification,
  } = handlers;

  // Use variables to avoid lint errors while keeping them available for future
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedResultsMode = resultsMode;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedGameResults = gameResults;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedSetGameResults = setGameResults;

  const handleExportTemplate = useCallback(() => {
    const template = exportToStructuredTemplate(flowState);
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const filename = `template_${metadata?.name?.replace(/\s+/g, '_') || 'tournament'}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addNotification(t('ui:notification.autoSaveSuccess'), 'success', 'Template Exported');
  }, [flowState, metadata?.name, addNotification, t]);

  const { saveTrigger } = ui || {};
  const isLocked = metadata?.status ? metadata.status !== 'DRAFT' : true;

  const onGenerateTournamentHandler = useCallback(() => setShowTournamentModal(true), []);

  const toolbarPropsValue = useMemo(() => ({
    onImport: handleImport,
    onExport: handleExport,
    onExportTemplate: handleExportTemplate,
    gamedayStatus: metadata?.status,
    canExport: ui?.canExport ?? false,
    onNotify: addNotification,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    stats,
  }), [handleImport, handleExport, handleExportTemplate, metadata?.status, ui?.canExport, addNotification, undo, redo, canUndo, canRedo, stats]);

  // Sync with context for AppHeader
  useEffect(() => {
    if (metadata?.name) {
      setGamedayName(prev => prev === metadata.name ? prev : metadata.name);
    }
    setContextLocked(prev => prev === isLocked ? prev : isLocked);
    
    // Pass the handler wrapped in another function to avoid React's functional update behavior for functions in state
    setOnGenerateTournament(onGenerateTournamentHandler);

    setToolbarProps(prev => {
      const resultsModeHandler = async () => {
        if (!id) return;
        if (!resultsMode) {
          const games = await gamedayApi.getGamedayGames(parseInt(id));
          setGameResults(games);
          setResultsMode(true);
        } else {
          setResultsMode(false);
        }
      };

      const newProps = {
        ...toolbarPropsValue,
        onResultsMode: resultsModeHandler,
        resultsMode
      };

      if (JSON.stringify(prev) === JSON.stringify(newProps)) return prev;
      return newProps as typeof toolbarPropsValue;
    });
  }, [metadata?.name, isLocked, onGenerateTournamentHandler, toolbarPropsValue, setGamedayName, setContextLocked, setOnGenerateTournament, setToolbarProps, id, resultsMode, setResultsMode, setGameResults]);

  const handleSaveBulkResults = async (results: Record<string, unknown>) => {
    if (!id) return;
    const gamedayId = parseInt(id);
    
    try {
      // Group by gameId
      const groupedResults: Record<number, unknown[]> = {};
      Object.entries(results).forEach(([key, val]) => {
        const gameId = parseInt(key.split('-')[0]);
        if (!groupedResults[gameId]) groupedResults[gameId] = [];
        groupedResults[gameId].push(val);
      });

      await Promise.all(
        Object.entries(groupedResults).map(([gameId, res]) => 
          gamedayApi.updateBulkGameResults(gamedayId, parseInt(gameId), res)
        )
      );

      setResultsMode(false);
      addNotification(t('ui:notification.autoSaveSuccess'), 'success', 'Results Saved');
      // Refresh state to show new scores in list
      loadGameday(gamedayId);
    } catch (error) {
      console.error('Failed to save bulk results', error);
      addNotification(t('ui:notification.saveResultFailed'), 'danger', t('ui:notification.title.error'));
    }
  };

  const lastSavedStateRef = useRef<string>('');
  const initialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<{ timer: NodeJS.Timeout | null; data: unknown }>({ timer: null, data: null });
  
  // Ref to always hold the LATEST state for the async saveData function to access
  const latestStateRef = useRef<FlowState | null>(null);
  useEffect(() => {
    latestStateRef.current = exportState();
  }, [exportState, metadata, nodes, edges, fields, globalTeams, globalTeamGroups]);

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
    
    // Disable auto-save in tests to prevent deadlocks and race conditions
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return;

    const currentState = exportState();
    const currentStateStr = JSON.stringify(currentState);
    
    // Skip initial load - establish baseline
    if (initialLoadRef.current) {
      if (metadata && metadata.id && metadata.id !== 0) {
        lastSavedStateRef.current = currentStateStr;
        initialLoadRef.current = false;
        console.log('[AutoSave] Baseline established for gameday', metadata.id);
      }
      return;
    }

    if (currentStateStr === lastSavedStateRef.current) return;

    // Clear existing timer if any
    if (pendingSaveRef.current.timer) {
      clearTimeout(pendingSaveRef.current.timer);
    }

    const saveData = async () => {
      if (isSavingRef.current) {
        // If already saving, reschedule to try again shortly
        pendingSaveRef.current.timer = setTimeout(saveData, 500);
        return;
      }

      // Access the ABSOLUTE LATEST state from the ref, not the closure
      const latestState = latestStateRef.current;
      if (!latestState) return;
      
      const latestStateStr = JSON.stringify(latestState);
      
      if (!metadata?.id || metadata.id === 0 || isTransitioning) return;
      if (latestStateStr === lastSavedStateRef.current) return;

      try {
        isSavingRef.current = true;
        const { 
          name, date, start, format, address, season, league, status 
        } = latestState.metadata;

        // Construct patch data dynamically
        const patchData: Partial<GamedayMetadata> & { designer_data: Record<string, unknown> } = {
          designer_data: {
            ...latestState.metadata.designer_data,
            nodes: latestState.nodes,
            edges: latestState.edges,
            fields: latestState.fields,
            globalTeams: latestState.globalTeams,
            globalTeamGroups: latestState.globalTeamGroups
          }
        };

        if (name && name.trim() !== '') patchData.name = name;
        if (date && date !== '') patchData.date = date;
        if (start && start !== '') patchData.start = start;
        if (format) patchData.format = format;
        if (address !== undefined) patchData.address = address;
        if (season && season !== 0) patchData.season = season;
        if (league && league !== 0) patchData.league = league;
        if (status) patchData.status = status;

        await gamedayApi.patchGameday(metadata.id, patchData);
        console.log('[AutoSave] Success: Gameday', metadata.id, 'persisted with data:', patchData);
        addNotification(t('ui:notification.autoSaveSuccess'), 'success', t('ui:notification.title.autoSave'));
        
        // Update baseline with what we actually saved
        lastSavedStateRef.current = latestStateStr;
        pendingSaveRef.current.timer = null;
      } catch (error) {
        console.error('Auto-save failed', error);
        addNotification(t('ui:notification.autoSaveFailed'), 'warning', t('ui:notification.title.autoSave'));
      } finally {
        isSavingRef.current = false;
      }
    };

    pendingSaveRef.current.timer = setTimeout(saveData, 1500); // 1.5s debounce

    const currentTimer = pendingSaveRef.current.timer;
    return () => {
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    };
  }, [metadata, nodes, edges, fields, globalTeams, globalTeamGroups, validation?.errors, loading, isTransitioning, addNotification, exportState, t, saveTrigger]);


  // CRITICAL: Handle immediate save on unmount
  useEffect(() => {
    const currentPendingSave = pendingSaveRef.current;
    return () => {
      if (currentPendingSave.data) {
        const { stateObj } = currentPendingSave.data;
        
        // Re-calculate one last time to be ABSOLUTELY sure we have latest
        // although we update .data on every render that triggers auto-save effect.
        const { 
          name, date, start, format, address, season, league, status 
        } = stateObj.metadata;

        const savePromise = gamedayApi.patchGameday(stateObj.metadata.id, {
          name, date, start, format, address, season, league, status,
          designer_data: {
            ...stateObj.metadata.designer_data,
            nodes: stateObj.nodes,
            edges: stateObj.edges,
            fields: stateObj.fields,
            globalTeams: stateObj.globalTeams,
            globalTeamGroups: stateObj.globalTeamGroups
          }
        });
        
        if (savePromise && typeof savePromise.catch === 'function') {
          savePromise.catch(err => console.error('Unmount save failed', err));
        }
      }
    };
  }, []);

  const [activeGameIdForResult, setActiveGameIdForResult] = useState<string | null>(null);
  const handleOpenResultModal = useCallback((gameId: string) => {
    setActiveGameIdForResult(gameId);
    setShowResultModal(true);
  }, []);

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
    } catch (error) {
      console.error('Failed to load gameday', error);
      addNotification(t('ui:notification.loadGamedayFailed'), 'danger', t('ui:notification.title.error'));
      navigate('/');
    } finally {
      setLoading(false);
      setIsTransitioning(false);
    }
  }, [importState, updateMetadata, addNotification, navigate, t]);

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
    try {
      const updated = await gamedayApi.publish(metadata.id);
      
      // Update local state. 
      // First import nodes/edges/etc.
      if (updated.designer_data?.nodes) {
        importState({
          metadata: updated,
          nodes: updated.designer_data.nodes,
          edges: updated.designer_data.edges,
          fields: updated.designer_data.fields,
          globalTeams: updated.designer_data.globalTeams,
          globalTeamGroups: updated.designer_data.globalTeamGroups
        });
      } else {
        updateMetadata(updated);
      }
      
      lastSavedStateRef.current = JSON.stringify(exportState());
      addNotification(t('ui:notification.publishSuccess'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to publish', error);
      addNotification(t('ui:notification.publishFailed'), 'danger', t('ui:notification.title.error'));
    } finally {
      setIsTransitioning(false);
    }
  }, [metadata.id, importState, updateMetadata, addNotification, exportState, t]);

  const handleUnlockWrapped = useCallback(async () => {
    setIsTransitioning(true);
    try {
      const updated = await gamedayApi.patchGameday(metadata.id, { status: 'DRAFT' });
      
      if (updated.designer_data?.nodes) {
        importState({
          metadata: updated,
          nodes: updated.designer_data.nodes,
          edges: updated.designer_data.edges,
          fields: updated.designer_data.fields,
          globalTeams: updated.designer_data.globalTeams,
          globalTeamGroups: updated.designer_data.globalTeamGroups
        });
      } else {
        updateMetadata(updated);
      }
      
      lastSavedStateRef.current = JSON.stringify(exportState());
      addNotification(t('ui:notification.unlockSuccess'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to unlock', error);
      addNotification(t('ui:notification.unlockFailed'), 'danger', t('ui:notification.title.error'));
    } finally {
      setIsTransitioning(false);
    }
  }, [metadata.id, importState, updateMetadata, addNotification, exportState, t]);

  const handleSaveResult = async (gameId: string | number, halftime: { home: number; away: number }, final: { home: number; away: number }) => {
    let numericId: number | null = null;
    if (typeof gameId === 'string') {
      const parts = gameId.split('-');
      // Last part is the numeric ID if it follows game-ID format
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart);
      if (!isNaN(parsed) && lastPart === parsed.toString()) {
        numericId = parsed;
      }
    } else {
      numericId = gameId;
    }
    
    // Update local state immediately regardless of backend ID
    const stringId = typeof gameId === 'string' ? gameId : `game-${gameId}`;
    handleUpdateNode(stringId, {
      halftime_score: halftime,
      final_score: final,
      status: 'COMPLETED'
    });

    if (numericId === null) {
      console.log(`[GameResult] Game ${gameId} has no backend ID, saved to local state only.`);
      setShowResultModal(false);
      addNotification(t('ui:notification.gameResultSaved'), 'success', t('ui:notification.title.success'));
      return;
    }

    try {
      await gamedayApi.updateGameResult(numericId, {
        halftime_score: halftime,
        final_score: final
      });
      
      setShowResultModal(false);
      addNotification(t('ui:notification.gameResultSaved'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to save result to backend', error);
      addNotification(t('ui:notification.saveResultFailed'), 'danger', t('ui:notification.title.error'));
    }
  };

  const activeGame = nodes.find(n => n.id === activeGameIdForResult);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">{t('ui:message.loading', 'Loading...')}</span>
          </div>
          <p className="text-muted">{t('ui:message.loadingGameday', 'Loading gameday data...')}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="list-designer-app h-100 d-flex flex-column p-0">
      <div 
        className="list-designer-content flex-grow-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div className="metadata-container-wrapper sticky-top bg-white border-bottom shadow-sm" style={{ top: '0px', zIndex: 1020 }}>
          <div className="container-xl px-0">
            <Accordion 
              activeKey={metadataActiveKey} 
              onSelect={(key) => setMetadataActiveKey(key as string)}
              className="metadata-accordion border-0 shadow-none"
            >
              <GamedayMetadataAccordion
                metadata={metadata}
                onUpdate={handleUpdateMetadataWrapped}
                onClearAll={handleClearAll}
                onDelete={() => navigate('/', { state: { pendingDeleteId: metadata.id } })}
                onPublish={handlePublishWrapped}
                onUnlock={handleUnlockWrapped}
                onHighlight={handleHighlightElement}
                validation={validation}
                highlightedElement={ui?.highlightedElement}
                readOnly={isLocked}
                hasData={ui?.hasData ?? false}
              />
            </Accordion>
          </div>
        </div>

        <div className="pt-3 pb-5">
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
            onHighlightElement={handleHighlightElement}
            selectedNodeId={selectedNode?.id || null}
            highlightedElement={ui?.highlightedElement}
            expandedFieldIds={ui?.expandedFieldIds || new Set()}
            expandedStageIds={ui?.expandedStageIds || new Set()}
            onAddGlobalTeam={handleAddGlobalTeam}
            onUpdateGlobalTeam={handleUpdateGlobalTeam}
                    onDeleteGlobalTeam={handleDeleteGlobalTeam}
                    onReplaceGlobalTeam={handleReplaceGlobalTeam}
                    onReorderGlobalTeam={handleReorderGlobalTeam}

            onAddGlobalTeamGroup={handleAddGlobalTeamGroup}
            onUpdateGlobalTeamGroup={updateGlobalTeamGroup}
            onDeleteGlobalTeamGroup={deleteGlobalTeamGroup}
                    onReorderGlobalTeamGroup={reorderGlobalTeamGroup}
                    getTeamUsage={getTeamUsage}
                    onShowTeamSelection={(id, mode) => {
                      if (mode === 'replace') {
                        setActiveReplaceTeamId(id);
                        setActiveTeamGroupId(null);
                      } else {
                        setActiveTeamGroupId(id);
                        setActiveReplaceTeamId(null);
                      }
                      setShowTeamSelectionModal(true);
                    }}
                    onAssignTeam={handleAssignTeam}
            
            onSwapTeams={handleSwapTeams}
            onAddGame={addGameNodeInStage}
            onAddGameToGameEdge={addGameToGameEdge}
            onAddStageToGameEdge={addStageToGameEdge}
            onRemoveEdgeFromSlot={removeEdgeFromSlot}
            onOpenResultModal={handleOpenResultModal}
            onNotify={addNotification}
            onAddOfficials={addOfficialsGroup}
            onGenerateTournament={onGenerateTournamentHandler}
            resultsMode={resultsMode}
            gameResults={gameResults}
            onSaveBulkResults={handleSaveBulkResults}
            readOnly={isLocked}
          />
        </div>
      </div>

      {/* Tournament Generation Modal */}
      <TournamentGeneratorModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        teams={globalTeams}
        hasData={ui?.hasData ?? false}
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
          setActiveGameIdForResult(null);
          handleSelectNode(null);
        }}
        game={activeGame as GameNode}
        homeTeamName={globalTeams.find(t => t.id === activeGame?.data.homeTeamId)?.label || (activeGame?.data.homeTeamDynamic ? formatTeamReference(activeGame.data.homeTeamDynamic) : 'Home')}
        awayTeamName={globalTeams.find(t => t.id === activeGame?.data.awayTeamId)?.label || (activeGame?.data.awayTeamDynamic ? formatTeamReference(activeGame.data.awayTeamDynamic) : 'Away')}
        onSave={(data) => activeGame && handleSaveResult(activeGame.id, data.halftime_score, data.final_score)}
      />

      {/* Team Selection Modal */}
      <TeamSelectionModal
        show={showTeamSelectionModal}
        onHide={() => {
          setShowTeamSelectionModal(false);
          setActiveTeamGroupId(null);
          setActiveReplaceTeamId(null);
        }}
        groupId={activeTeamGroupId || ''}
        title={
          activeReplaceTeamId 
            ? t('ui:button.replaceTeam') 
            : undefined
        }
        onSelect={(team) => {
          if (activeReplaceTeamId) {
            handleReplaceGlobalTeam(activeReplaceTeamId, team);
          } else if (activeTeamGroupId) {
            handleConnectTeam(team, activeTeamGroupId);
          }
        }}
      />
    </Container>
  );
};

export default ListDesignerApp;
