import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap';
import { useDesignerController } from '../hooks/useDesignerController';
import { useFlowState } from '../hooks/useFlowState';
import ListCanvas from './ListCanvas';
import { GameResultsTable, ScoreEdit } from './GameResultsTable';
import PublishConfirmationModal from './modals/PublishConfirmationModal';
import DeleteGamedayConfirmModal from './modals/DeleteGamedayConfirmModal';
import GameResultModal from './modals/GameResultModal';
import TeamSelectionModal from './modals/TeamSelectionModal';
import NotificationToast from './ui/NotificationToast';
import LoadingOverlay from './ui/LoadingOverlay';
import TemplateLibraryModal from './modals/TemplateLibraryModal';
import { useGamedayContext } from '../context/GamedayContext';
import type { GameNode } from '../types/flowchart';
import { isGameNode, GlobalTeam } from '../types/flowchart';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { gamedayApi } from '../api/gamedayApi';
import { getAllTemplates } from '../utils/tournamentTemplates';
import type { GenericTemplate } from '../utils/templateMapper';
import type { TournamentTemplate } from '../types/tournament';
import { trackEvent } from '../trackEvent';
import { useTourSeen } from '../onboarding/useTourSeen';
import DesignerTour from '../onboarding/DesignerTour';
import './ListDesignerApp.css';

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('gameday_session_id');
  if (!sessionId) {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionId = `session_${Date.now()}_${randomString}`;
    sessionStorage.setItem('gameday_session_id', sessionId);
  }
  return sessionId;
};

const ListDesignerApp: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTypedTranslation(['ui', 'domain']);
  const {
    setGamedayName,
    setToolbarProps,
    setIsLocked: setContextLocked,
    setOnOpenTemplates,
    setReplayTourA,
    currentUserId,
    resultsMode,
    setResultsMode,
    gameResults,
    setGameResults,
  } = useGamedayContext();

  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedGameForResult, setSelectedGameForResult] = useState<GameNode | null>(null);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [isRowCollapsed, setIsRowCollapsed] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
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
    handleAddGameToGameEdge,
    handleAddStageToGameEdge,
    handleSwapTeams,
    handleDeleteNode,
    handleSelectNode,
    handleAddGlobalTeam,
    handleAddGlobalTeamGroup,
    handleAddOfficialsGroup,
    handleAddFieldContainer,
    handleAddStage,
    handleGenerateTournament,
    handleSaveTemplate,
    dismissNotification,
    addNotification,
  } = handlers;

  const isLocked = metadata?.status ? metadata.status !== 'DRAFT' : false;

  // --- Onboarding Tour A (manual build) ---
  const { seen: tourASeen, loading: tourALoading, markSeen: markTourASeen } = useTourSeen('manual_build');
  const [tourAKey, setTourAKey] = useState(0); // force re-mount for replay
  const [tourAStarted, setTourAStarted] = useState(false); // tracks manual replay
  const autoStartRef = useRef(false);

  const shouldRunTourA = !tourALoading && !tourASeen && id && !tourAStarted;

  // Auto-start Tour A on first visit
  useEffect(() => {
    if (shouldRunTourA && !autoStartRef.current) {
      autoStartRef.current = true;
      trackEvent('gd_tour_manual_build_started', { replay: false });
    }
  }, [shouldRunTourA]);

  const handleTourAFinish = useCallback(() => {
    markTourASeen();
    localStorage.removeItem('gd_tour_manual_build_gameday_id');
  }, [markTourASeen]);

  const replayTourA = useCallback(() => {
    setTourAKey((k) => k + 1);
    setTourAStarted(true);
    autoStartRef.current = true;
    trackEvent('gd_tour_manual_build_started', { replay: true });
  }, []);

  const tourASteps = [
    { target: '[data-testid="gameday-metadata-header"]', content: t('ui:tour.manual_build.metadata'), placement: 'bottom' as const },
    { target: '[data-testid="add-team-group-button"]', content: t('ui:tour.manual_build.team_pool'), placement: 'left' as const },
    { target: '[data-testid="add-field-button"]', content: t('ui:tour.manual_build.fields'), placement: 'bottom' as const },
    { target: '[data-testid="publish-schedule-button"]', content: t('ui:tour.manual_build.publish'), placement: 'left' as const },
  ];

  // --- Onboarding Tour B (save template nudge) ---
  const { seen: tourBSeen, loading: tourBLoading, markSeen: markTourBSeen } = useTourSeen('save_template');
  const [runTourB, setRunTourB] = useState(false);
  const [tourBKey, setTourBKey] = useState(0);

  const handleTourBFinish = useCallback(() => {
    setRunTourB(false);
    markTourBSeen();
  }, [markTourBSeen]);

  const replayTourB = useCallback(() => {
    setTourBKey((k) => k + 1);
    setRunTourB(true);
    trackEvent('gd_tour_save_template_started', { replay: true });
  }, []);

  const tourBSteps = [
    { target: '[data-testid="open-template-library-button"]', content: t('ui:tour.save_template.nudge'), placement: 'left' as const },
  ];

  // Expose the header '?' button's handler via context: replays Tour A on a
  // draft gameday, or Tour B (save-as-template nudge) once published, since
  // Tour A's steps target metadata/team-pool/fields actions that are disabled
  // once locked.
  const replayCurrentTour = useCallback(() => {
    if (isLocked) {
      replayTourB();
    } else {
      replayTourA();
    }
  }, [isLocked, replayTourA, replayTourB]);

  useEffect(() => {
    setReplayTourA(() => replayCurrentTour);
    return () => setReplayTourA(null);
  }, [replayCurrentTour, setReplayTourA]);

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

  useEffect(() => {
    setOnOpenTemplates(() => () => setShowTemplateLibrary(true));
    return () => setOnOpenTemplates(null);
  }, [setOnOpenTemplates]);

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
    const newProps = {
      onImport: handleImport,
      onExport: handleExport,
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
    handleImport, handleExport, metadata?.status, ui?.canExport,
    addNotification, undo, redo, canUndo, canRedo, stats, resultsModeHandler, 
    resultsMode, setToolbarProps
  ]);

  const lastSavedStateRef = useRef<string>('');
  const initialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const pendingSaveRef = useRef<{ timer: ReturnType<typeof setTimeout> | null }>({ timer: null });

  const latestStateRef = useRef<typeof flowState | null>(null);
  useEffect(() => {
    latestStateRef.current = flowState;
  }, [flowState]);

  // Debounced auto-save with queue to prevent lost updates
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
      if (isSavingRef.current) {
        // Queue a retry after the current save completes
        saveQueuedRef.current = true;
        return;
      }

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

        // If a save was queued during this one, trigger it now
        if (saveQueuedRef.current) {
          saveQueuedRef.current = false;
          const queuedState = latestStateRef.current?.exportState();
          if (queuedState) {
            saveData(queuedState).then(() => {
              lastSavedStateRef.current = JSON.stringify(queuedState);
            }).catch(() => {
              addNotification(t('ui:notification.autoSaveFailed'), 'warning', t('ui:notification.title.autoSave'));
            });
          }
        }
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

  // Flush pending save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSaveRef.current.timer) {
        clearTimeout(pendingSaveRef.current.timer);
      }
      if (!isSavingRef.current) {
        const stateToSave = latestStateRef.current?.exportState();
        if (stateToSave) {
          saveData(stateToSave).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveData]);

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

  // Track designer opened event
  useEffect(() => {
    if (id) {
      trackEvent('gameday_designer_opened', {
        gameday_id: id,
        session_id: getSessionId(),
      });
    }
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

      // Track game result saved event
      trackEvent('game_result_saved', {
        gameday_id: id,
        game_id: selectedGameForResult.id,
        halftime_score: `${data.halftime_score.home}-${data.halftime_score.away}`,
        final_score: `${data.final_score.home}-${data.final_score.away}`,
      });
    } catch (error) {
      console.error('Failed to save result', error);
      addNotification(t('ui:notification.saveResultFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [selectedGameForResult, handleUpdateNode, addNotification, t, id]);

  const handleShowTeamSelection = useCallback((slotId: string, side: 'home' | 'away' | 'official' | 'group' | 'replace') => {
    setTeamSelectionModalContext({ slotId, side });
    setShowTeamSelectionModal(true);
  }, []);

  const handleTeamSelected = useCallback((selectedTeams: GlobalTeam[]) => {
    if (teamSelectionContext && selectedTeams.length > 0) {
      if (teamSelectionContext.side === 'group') {
        selectedTeams.forEach(team => {
          const teamId = typeof team.id === 'string' ? parseInt(team.id) : team.id;
          const teamObj = { id: teamId, text: team.label };
          handleConnectTeam(teamObj, teamSelectionContext.slotId);
        });
      } else {
        const team = selectedTeams[0];
        const teamId = typeof team.id === 'string' ? parseInt(team.id) : team.id;
        const teamObj = { id: teamId, text: team.label };
        if (teamSelectionContext.side === 'replace') {
          handleReplaceGlobalTeam(teamSelectionContext.slotId, teamObj);
        } else {
          handleAssignTeam(teamSelectionContext.slotId, String(teamId), teamSelectionContext.side as 'home' | 'away');
        }
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
      // Count games and stages from current flowState
      const gameCount = flowState.nodes.filter(n => n.type === 'game').length;
      const stageCount = flowState.nodes.filter(n => n.type === 'stage').length;

      await gamedayApi.publish(parseInt(id!));
      addNotification(t('ui:notification.publishSuccess'), 'success', t('ui:notification.title.success'));

      // Track gameday published event
      trackEvent('gameday_published', {
        gameday_id: id,
        game_count: gameCount,
        stage_count: stageCount,
      });

      // Trigger Tour B (save template nudge) if unseen
      if (!tourBLoading && !tourBSeen) {
        setRunTourB(true);
        trackEvent('gd_tour_save_template_started', { replay: false });
      }

      loadData();
    } catch {
      addNotification(t('ui:notification.publishFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [id, addNotification, t, loadData, flowState.nodes, tourBLoading, tourBSeen]);

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

  const handleAutoAssignOfficials = useCallback(async () => {
    if (!id) return;
    setIsAutoAssigning(true);
    try {
      const result = await gamedayApi.autoAssignOfficials(parseInt(id));
      addNotification(
        t('ui:notification.officialsAssigned', { count: result.assigned_count }),
        'success',
        t('ui:notification.title.success')
      );
      loadData();
    } catch {
      addNotification(t('ui:notification.officialsAssignFailed'), 'danger', t('ui:notification.title.error'));
    } finally {
      setIsAutoAssigning(false);
    }
  }, [id, addNotification, t, loadData]);

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
          if (scrollTop > 50 && !isRowCollapsed) {
            setIsRowCollapsed(true);
          } else if (scrollTop <= 50 && isRowCollapsed) {
            setIsRowCollapsed(false);
          }
        }}
      >
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
              gamedayId={id ? parseInt(id) : undefined}
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
              onAddGameToGameEdge={handleAddGameToGameEdge}
              onAddStageToGameEdge={handleAddStageToGameEdge}
              onRemoveEdgeFromSlot={handleRemoveEdgeFromSlot}
              onOpenResultModal={handleOpenResultModal}
              onOpenTemplates={() => setShowTemplateLibrary(true)}
              expandedFieldIds={ui?.expandedFieldIds || new Set()}
              expandedStageIds={ui?.expandedStageIds || new Set()}
              highlightedElement={ui?.highlightedElement}
              highlightedSourceGameId={ui?.highlightedSourceGameId}
              onDynamicReferenceClick={handleDynamicReferenceClick}
              onNotify={addNotification}
              onAddOfficials={handleAddOfficialsLocal}
              onAutoAssignOfficials={handleAutoAssignOfficials}
              isAutoAssigning={isAutoAssigning}
              resultsMode={resultsMode}
              gameResults={gameResults}
              onSaveBulkResults={handleSaveBulkResults}
              readOnly={isLocked}
              metadata={metadata}
              onUpdateMetadata={handleUpdateMetadata}
              onClearAll={handleClearAll}
              onDeleteGameday={() => setShowDeleteModal(true)}
              onPublishGameday={() => setShowPublishModal(true)}
              onUnlockGameday={async () => {
                try {
                  await gamedayApi.patchGameday(parseInt(id), { status: 'DRAFT' });
                  addNotification(t('ui:notification.unlockSuccess'), 'success', t('ui:notification.title.success'));
                  loadData();
                } catch {
                  addNotification(t('ui:notification.unlockFailed'), 'danger', t('ui:notification.title.error'));
                }
              }}
              validation={validation}
              isRowCollapsed={isRowCollapsed}
            />
          )}
      </div>

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
        gamedayId={id ? parseInt(id) : 0}
        mode={teamSelectionContext?.side === 'group' ? 'group' : 'single'}
        preselectedTeams={teamSelectionContext?.side === 'group' ? flowState.globalTeams.filter(t => t.groupId === teamSelectionContext.slotId) : []}
        allTeams={teamSelectionContext?.slotId === 'group-officials'}
      />

      <TemplateLibraryModal
        show={showTemplateLibrary}
        onHide={() => setShowTemplateLibrary(false)}
        gamedayId={parseInt(id)}
        currentUserId={currentUserId}
        isLocked={isLocked}
        onScheduleApplied={() => { void loadData(); }}
        onGenerateFromBuiltin={(config) => {
          const template = getAllTemplates().find(t => t.id === config.templateId);
          if (!template) return;
          handleGenerateTournament({
            template,
            fieldCount: config.fieldCount,
            startTime: config.startTime,
            gameDuration: config.gameDuration,
            breakDuration: config.breakDuration,
            generateTeams: config.generateTeams,
            autoAssignTeams: config.generateTeams,
            selectedTeams: config.selectedTeams,
          });
        }}
        onGenerateFromSavedTemplate={(templateId, config, selectedTeams) => {
          handleGenerateTournament({
            template: null as unknown as TournamentTemplate,
            fieldCount: 2,
            startTime: config?.startTime ?? '09:00',
            gameDuration: config?.gameDuration ?? 15,
            breakDuration: config?.breakDuration ?? 0,
            generateTeams: true,
            autoAssignTeams: false,
            customTemplate: { id: templateId } as GenericTemplate,
            selectedTeams,
          });
        }}
        onNotify={addNotification}
        onSaveTemplate={handleSaveTemplate}
      />

      <NotificationToast
        notifications={ui?.notifications || []}
        onClose={dismissNotification}
      />

      {ui?.isLoading && <LoadingOverlay message={t('ui:message.loading')} />}

      <DesignerTour
        key={tourAKey}
        tourId="manual_build"
        steps={tourASteps}
        run={shouldRunTourA || tourAStarted}
        onFinish={handleTourAFinish}
      />

      <DesignerTour
        key={tourBKey}
        tourId="save_template"
        steps={tourBSteps}
        run={runTourB}
        onFinish={handleTourBFinish}
      />
    </div>
  );
};

export default ListDesignerApp;
