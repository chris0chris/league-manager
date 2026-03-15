import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Stack, Alert } from 'react-bootstrap';
import { useDesignerController } from '../hooks/useDesignerController';
import { useFlowState } from '../hooks/useFlowState';
import ListCanvas from './ListCanvas';
import { GameResultsTable, ScoreEdit } from './GameResultsTable';
import { FlowToolbarProps } from './FlowToolbar';
import GamedayMetadataAccordion from './GamedayMetadataAccordion';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import PublishConfirmationModal from './modals/PublishConfirmationModal';
import DeleteGamedayConfirmModal from './modals/DeleteGamedayConfirmModal';
import GameResultModal from './modals/GameResultModal';
import TeamSelectionModal from './modals/TeamSelectionModal';
import NotificationToast from './ui/NotificationToast';
import LoadingOverlay from './ui/LoadingOverlay';
import { useGamedayContext } from '../context/GamedayContext';
import { GameNode } from '../types/designer';
import { isGameNode } from '../types/flowchart';
import { exportToStructuredTemplate } from '../utils/flowchartExport';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { gamedayApi } from '../api/gamedayApi';
import './ListDesignerApp.css';

const ListDesignerApp: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTypedTranslation(['ui', 'domain']);
  const { 
    setGamedayName, 
    setToolbarProps, 
    setIsLocked: setContextLocked,
    resultsMode,
    setResultsMode,
    gameResults,
    setGameResults,
    setOnGenerateTournament
  } = useGamedayContext();

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedGameForResult, setSelectedGameForResult] = useState<GameNode | null>(null);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false);
  const [teamSelectionContext, setTeamSelectionModalContext] = useState<{
    slotId: string;
    side: 'home' | 'away' | 'official' | 'group' | 'replace';
  } | null>(null);

  const flowState = useFlowState();

  const {
    metadata,
    ui,
    validation,
    handlers,
    canUndo,
    canRedo,
    undo,
    redo,
    stats,
  } = useDesignerController(id, flowState);

  const {
    loadData,
    saveData,
    handleUpdateNode,
    handleImport,
    handleExport,
    handleClearAll,
    handleUpdateMetadata,
    handleUpdateGlobalTeam,
    handleDeleteGlobalTeam,
    handleReplaceGlobalTeam,
    handleReorderGlobalTeam,
    handleUpdateGlobalTeamGroup,
    handleDeleteGlobalTeamGroup,
    handleReorderGlobalTeamGroup,
    handleHighlightElement,
    handleDynamicReferenceClick,
    handleUpdateGameSlot,
    handleRemoveEdgeFromSlot,
    handleAssignTeam,
    handleConnectTeam,
    handleSwapTeams,
    handleDeleteNode,
    handleSelectNode,
    handleGenerateTournament,
    handleAddGlobalTeam,
    handleAddGlobalTeamGroup,
    handleAddOfficialsGroup,
    handleAddFieldContainer,
    handleAddStage,
    dismissNotification,
    addNotification,
    showTournamentModal,
    setShowTournamentModal,
  } = handlers;

  const handleExportTemplate = useCallback(() => {
    const state = flowState.exportState();
    const template = exportToStructuredTemplate(state);
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
    
    addNotification(t('ui:notification.autoSaveSuccess'), 'success', t('ui:notification.templateExported.title'));
  }, [flowState, metadata?.name, addNotification, t]);

  const isLocked = metadata?.status ? metadata.status !== 'DRAFT' : false;

  const lastGamedayNameRef = useRef('');
  const lastIsLockedRef = useRef<boolean | null>(null);

  // Sync basic metadata with context
  useEffect(() => {
    if (metadata?.name && metadata.name !== lastGamedayNameRef.current) {
      lastGamedayNameRef.current = metadata.name;
      setGamedayName(metadata.name);
    }
    if (isLocked !== lastIsLockedRef.current) {
      lastIsLockedRef.current = isLocked;
      setContextLocked(isLocked);
    }
  }, [metadata?.name, isLocked, setGamedayName, setContextLocked]);

  const showModalRef = useRef(setShowTournamentModal);
  useEffect(() => {
    showModalRef.current = setShowTournamentModal;
  }, [setShowTournamentModal]);

  useEffect(() => {
    setOnGenerateTournament(() => () => showModalRef.current(true));
  }, [setOnGenerateTournament]);

  const resultsModeHandler = useCallback(async () => {
    if (!id) return;
    if (!resultsMode) {
      const games = await gamedayApi.getGamedayGames(parseInt(id));
      setGameResults(games);
      setResultsMode(true);
    } else {
      setResultsMode(false);
    }
  }, [id, resultsMode, setGameResults, setResultsMode]);

  const lastToolbarPropsRef = useRef<string>('');

  useEffect(() => {
    const newProps: FlowToolbarProps = {
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
      onResultsMode: resultsModeHandler,
      resultsMode
    };

    const propsStateStr = JSON.stringify({
      gamedayStatus: newProps.gamedayStatus,
      canExport: newProps.canExport,
      canUndo: newProps.canUndo,
      canRedo: newProps.canRedo,
      stats: newProps.stats,
      resultsMode: newProps.resultsMode
    });

    if (propsStateStr !== lastToolbarPropsRef.current) {
      lastToolbarPropsRef.current = propsStateStr;
      setToolbarProps(newProps);
    }
  }, [
    handleImport, handleExport, handleExportTemplate, metadata?.status, ui?.canExport, 
    addNotification, undo, redo, canUndo, canRedo, stats, resultsModeHandler, 
    resultsMode, setToolbarProps
  ]);

  const lastSavedStateRef = useRef<string>('');
  const initialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<{ timer: NodeJS.Timeout | null; data: unknown }>({ timer: null, data: null });
  
  const latestStateRef = useRef<typeof flowState | null>(null);
  useEffect(() => {
    latestStateRef.current = flowState;
  }, [flowState]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      lastSavedStateRef.current = JSON.stringify(flowState.exportState());
      return;
    }

    if (isLocked) return;

    const currentState = flowState.exportState();
    const currentStateStr = JSON.stringify(currentState);
    if (currentStateStr === lastSavedStateRef.current) return;

    if (pendingSaveRef.current.timer) {
      clearTimeout(pendingSaveRef.current.timer);
    }

    pendingSaveRef.current.timer = setTimeout(async () => {
      if (isSavingRef.current) return;
      
      try {
        isSavingRef.current = true;
        const stateToSave = latestStateRef.current?.exportState() || currentState;
        await saveData(stateToSave);
        lastSavedStateRef.current = JSON.stringify(stateToSave);
      } catch (error) {
        console.error('Auto-save failed', error);
        addNotification(t('ui:notification.autoSaveFailed'), 'warning', t('ui:notification.title.autoSave'));
      } finally {
        isSavingRef.current = false;
        pendingSaveRef.current.timer = null;
      }
    }, 1500);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentPendingSave = pendingSaveRef.current;
      if (currentPendingSave.timer) {
        clearTimeout(currentPendingSave.timer);
      }
    };
  }, [flowState, saveData, isLocked, addNotification, t]);

  useEffect(() => {
    if (id) {
      loadData().catch(err => {
        console.error('Failed to load gameday data', err);
        addNotification(t('ui:notification.loadGamedayFailed'), 'danger', t('ui:notification.title.error'));
        navigate('/');
      });
    }
    // Only run when ID changes. loadData is stable but we avoid any risk of loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOpenResultModal = useCallback((gameId: string) => {
    const gameNode = flowState.nodes.find((n) => n.id === gameId && isGameNode(n)) as GameNode | undefined;
    if (gameNode) {
      setSelectedGameForResult(gameNode);
      setShowResultModal(true);
    }
  }, [flowState.nodes]);

  const handleSaveResult = useCallback(async (data: { halftime_score: { home: number; away: number }; final_score: { home: number; away: number } }) => {
    if (!selectedGameForResult) return;

    try {
      handleUpdateNode(selectedGameForResult.id, {
        halftime_score: data.halftime_score,
        final_score: data.final_score,
      });

      const dbIdPart = selectedGameForResult.id.split('-').pop();
      if (dbIdPart && !isNaN(parseInt(dbIdPart))) {
        await gamedayApi.updateGameResult(parseInt(dbIdPart), { halftime_score: data.halftime_score, final_score: data.final_score });
      }

      setShowResultModal(false);
      setSelectedGameForResult(null);
      addNotification(t('ui:notification.gameResultSaved'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to save result', error);
      addNotification(t('ui:notification.saveResultFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [selectedGameForResult, handleUpdateNode, addNotification, t]);

  const handleShowTeamSelection = useCallback((slotId: string, side: 'home' | 'away' | 'official' | 'group' | 'replace') => {
    setTeamSelectionModalContext({ slotId, side });
    setShowTeamSelectionModal(true);
  }, []);

  const handleTeamSelected = useCallback((team: { id: number; text: string }) => {
    if (teamSelectionContext) {
      if (teamSelectionContext.side === 'group') {
        handleConnectTeam(team, teamSelectionContext.slotId);
      } else if (teamSelectionContext.side === 'replace') {
        handleReplaceGlobalTeam(teamSelectionContext.slotId, String(team.id));
      } else {
        handleAssignTeam(teamSelectionContext.slotId, teamSelectionContext.side as 'home' | 'away', String(team.id));
      }
    }
    setShowTeamSelectionModal(false);
    setTeamSelectionModalContext(null);
  }, [teamSelectionContext, handleAssignTeam, handleConnectTeam, handleReplaceGlobalTeam]);

  const handleSaveBulkResults = useCallback(async (results: Record<string, ScoreEdit>) => {
    if (!id) return;
    try {
      const updatePromises = Object.entries(results).map(([, scores]) => {
        return gamedayApi.updateGameResultDetail(scores.gameInfoId!, {
          fh: scores.fh ?? undefined,
          sh: scores.sh ?? undefined,
        });
      });
      
      await Promise.all(updatePromises);
      
      const updatedGames = await gamedayApi.getGamedayGames(parseInt(id));
      setGameResults(updatedGames);
      
      addNotification(t('ui:notification.resultsSaved'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to save bulk results', error);
      addNotification(t('ui:notification.resultsSaveFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [id, setGameResults, addNotification, t]);

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false); // close immediately before awaiting API
    try {
      await gamedayApi.publish(parseInt(id!));
      addNotification(t('ui:notification.publishSuccess'), 'success', t('ui:notification.title.success'));
      loadData();
    } catch {
      addNotification(t('ui:notification.publishFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [id, addNotification, t, loadData]);

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteModal(false);
    try {
      await gamedayApi.deleteGameday(parseInt(id!));
      navigate('/');
    } catch {
      addNotification(t('ui:notification.deleteGamedayPermanentlyFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [id, addNotification, t, navigate]);

  const handleAddOfficialsLocal = useCallback(() => {
    handleAddOfficialsGroup();
  }, [handleAddOfficialsGroup]);

  const handleGetTeamUsage = useCallback((teamId: string) => {
    return flowState.nodes
      .filter(isGameNode)
      .filter(g => g.data.homeTeamId === teamId || g.data.awayTeamId === teamId)
      .map(g => ({ 
        gameId: g.id, 
        slot: g.data.homeTeamId === teamId ? 'home' as const : 'away' as const 
      }));
  }, [flowState.nodes]);

  if (!id) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{t('ui:error.gamedayNotFound')}</Alert>
      </Container>
    );
  }

  return (
    <div className="list-designer-app bg-light">
      <div 
        className="list-designer-app__content flex-grow-1 overflow-auto px-4 pb-5"
        onScroll={(e) => {
          const scrollTop = (e.target as HTMLDivElement).scrollTop;
          if (scrollTop > 50 && !isMetadataCollapsed) {
            setIsMetadataCollapsed(true);
          } else if (scrollTop <= 50 && isMetadataCollapsed) {
            setIsMetadataCollapsed(false);
          }
        }}
      >
        <Stack gap={4}>
          <div className="sticky-top bg-light py-2" style={{ zIndex: 1020 }}>
            <GamedayMetadataAccordion
            metadata={metadata}
            onUpdate={handleUpdateMetadata}
            onClearAll={handleClearAll}
            onDelete={() => setShowDeleteModal(true)}
            onPublish={() => setShowPublishModal(true)}
            onUnlock={async () => {
              try {
                await gamedayApi.patchGameday(parseInt(id), { status: 'DRAFT' });
                addNotification(t('ui:notification.unlockSuccess'), 'success', t('ui:notification.title.success'));
                loadData();
              } catch {
                addNotification(t('ui:notification.unlockFailed'), 'danger', t('ui:notification.title.error'));
              }
            }}
            validation={validation}
            highlightedElement={ui?.highlightedElement}
            onHighlight={handleHighlightElement}
            readOnly={isLocked}
            hasData={ui?.hasData ?? false}
            forceCollapsed={isMetadataCollapsed}
          />
        </div>

        {resultsMode ? (
            <div className="bg-white p-4 rounded shadow-sm">
              <h3 className="mb-4">{t('ui:label.gameResults')}</h3>
              <GameResultsTable 
                games={gameResults} 
                onSave={handleSaveBulkResults} 
              />
            </div>
          ) : (
            <ListCanvas
              nodes={flowState.nodes}
              edges={flowState.edges}
              globalTeams={flowState.globalTeams}
              globalTeamGroups={flowState.globalTeamGroups}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onAddField={handleAddFieldContainer}
              onAddStage={handleAddStage}
              onSelectNode={handleSelectNode}
              onHighlightElement={handleHighlightElement}
              selectedNodeId={ui?.selectedNodeId}
              onAddGlobalTeam={handleAddGlobalTeam}
              onUpdateGlobalTeam={handleUpdateGlobalTeam}
              onDeleteGlobalTeam={handleDeleteGlobalTeam}
              onReplaceGlobalTeam={handleReplaceGlobalTeam}
              onReorderGlobalTeam={handleReorderGlobalTeam}
              onAddGlobalTeamGroup={handleAddGlobalTeamGroup}
              onUpdateGlobalTeamGroup={handleUpdateGlobalTeamGroup}
              onDeleteGlobalTeamGroup={handleDeleteGlobalTeamGroup}
              onReorderGlobalTeamGroup={handleReorderGlobalTeamGroup}
              onShowTeamSelection={handleShowTeamSelection}
              getTeamUsage={handleGetTeamUsage}
              onAssignTeam={handleAssignTeam}
              onSwapTeams={handleSwapTeams}
              onAddGame={handleUpdateGameSlot}
              onAddGameToGameEdge={handleConnectTeam}
              onAddStageToGameEdge={handleConnectTeam}
              onRemoveEdgeFromSlot={handleRemoveEdgeFromSlot}
              onOpenResultModal={handleOpenResultModal}
              onGenerateTournament={() => setShowTournamentModal(true)}
              expandedFieldIds={ui?.expandedFieldIds || new Set()}
              expandedStageIds={ui?.expandedStageIds || new Set()}
              highlightedElement={ui?.highlightedElement}
              highlightedSourceGameId={ui?.highlightedSourceGameId}
              onDynamicReferenceClick={handleDynamicReferenceClick}
              onNotify={addNotification}
              onAddOfficials={handleAddOfficialsLocal}
              resultsMode={resultsMode}
              gameResults={gameResults}
              onSaveBulkResults={handleSaveBulkResults}
              readOnly={isLocked}
            />
          )}
        </Stack>
      </div>

      <TournamentGeneratorModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        onGenerate={handleGenerateTournament}
        teams={flowState.globalTeams}
        hasData={ui?.hasData ?? false}
      />

      <PublishConfirmationModal
        show={showPublishModal}
        onHide={() => setShowPublishModal(false)}
        onConfirm={handleConfirmPublish}
        validation={validation}
        onHighlight={handleHighlightElement}
      />

      <DeleteGamedayConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        gamedayName={metadata?.name}
      />

      <GameResultModal
        show={showResultModal}
        onHide={() => {
          setShowResultModal(false);
          handleSelectNode(null);
        }}
        game={selectedGameForResult}
        homeTeamName={selectedGameForResult
          ? (flowState.globalTeams.find(t => t.id === selectedGameForResult.data.homeTeamId)?.label ?? '')
          : ''}
        awayTeamName={selectedGameForResult
          ? (flowState.globalTeams.find(t => t.id === selectedGameForResult.data.awayTeamId)?.label ?? '')
          : ''}
        onSave={handleSaveResult}
      />

      <TeamSelectionModal
        show={showTeamSelectionModal}
        onHide={() => setShowTeamSelectionModal(false)}
        groupId={teamSelectionContext?.slotId ?? ''}
        onSelect={handleTeamSelected}
        title={teamSelectionContext?.side === 'official' ? t('ui:title.selectOfficial') : t('ui:title.selectTeam')}
      />

      <NotificationToast
        notifications={ui?.notifications || []}
        onClose={dismissNotification}
      />

      {ui?.isLoading && <LoadingOverlay message={t('ui:message.loading')} />}
    </div>
  );
};

export default ListDesignerApp;
