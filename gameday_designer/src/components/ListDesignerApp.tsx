import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Stack, Alert } from 'react-bootstrap';
import { useDesignerController } from '../hooks/useDesignerController';
import ListCanvas from './ListCanvas';
import FlowToolbar from './FlowToolbar';
import GamedayMetadataAccordion from './GamedayMetadataAccordion';
import TournamentGeneratorModal from './modals/TournamentGeneratorModal';
import GameResultModal from './modals/GameResultModal';
import TeamSelectionModal from './modals/TeamSelectionModal';
import NotificationToast from './ui/NotificationToast';
import LoadingOverlay from './ui/LoadingOverlay';
import { useGamedayContext } from '../context/GamedayContext';
import { FlowState, GameNode } from '../types/designer';
import { exportToStructuredTemplate } from '../utils/templateExport';
import { useTypedTranslation } from '../i18n/i18n';
import gamedayApi from '../api/gamedayApi';

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
    setGameResults
  } = useGamedayContext();

  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedGameForResult, setSelectedGameForResult] = useState<GameNode | null>(null);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [teamSelectionContext, setTeamSelectionModalContext] = useState<{
    slotId: string;
    side: 'home' | 'away' | 'official';
  } | null>(null);

  const {
    flowState,
    metadata,
    ui,
    handlers,
    canUndo,
    canRedo,
    undo,
    redo,
    stats,
  } = useDesignerController(id);

  const {
    loadData,
    saveData,
    handleUpdateNode,
    handleImport,
    handleExport,
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
    handleAddFieldContainer,
    handleAddStage,
    dismissNotification,
    addNotification,
  } = handlers;

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
    
    addNotification(t('ui:notification.autoSaveSuccess'), 'success', t('ui:notification.templateExported.title'));
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
      return newProps;
    });
  }, [metadata?.name, isLocked, onGenerateTournamentHandler, toolbarPropsValue, setGamedayName, setContextLocked, setOnGenerateTournament, setToolbarProps, id, resultsMode, setGameResults, setResultsMode]);

  const lastSavedStateRef = useRef<string>('');
  const initialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<{ timer: NodeJS.Timeout | null; data: unknown }>({ timer: null, data: null });
  
  // Ref to always hold the LATEST state for the async saveData function to access
  const latestStateRef = useRef<FlowState | null>(null);
  useEffect(() => {
    latestStateRef.current = flowState;
  }, [flowState]);

  // Handle auto-save
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      lastSavedStateRef.current = JSON.stringify(flowState);
      return;
    }

    if (isLocked) return;

    const currentStateStr = JSON.stringify(flowState);
    if (currentStateStr === lastSavedStateRef.current) return;

    // Throttle saves
    if (pendingSaveRef.current.timer) {
      clearTimeout(pendingSaveRef.current.timer);
    }

    pendingSaveRef.current.timer = setTimeout(async () => {
      if (isSavingRef.current) return;
      
      try {
        isSavingRef.current = true;
        // Use the ref to get the absolute latest state at the moment the timer fires
        const stateToSave = latestStateRef.current || flowState;
        await saveData(stateToSave);
        lastSavedStateRef.current = JSON.stringify(stateToSave);
      } catch (error) {
        console.error('Auto-save failed', error);
      } finally {
        isSavingRef.current = false;
        pendingSaveRef.current.timer = null;
      }
    }, 2000);

    return () => {
      if (pendingSaveRef.current.timer) {
        clearTimeout(pendingSaveRef.current.timer);
      }
    };
  }, [flowState, saveData, isLocked]);

  useEffect(() => {
    if (id) {
      loadData().catch(err => {
        console.error('Failed to load gameday data', err);
        addNotification(t('ui:notification.loadFailed'), 'danger', t('ui:notification.title.error'));
      });
    }
  }, [id, loadData, addNotification, t]);

  const handleOpenResultModal = useCallback((game: GameNode) => {
    setSelectedGameForResult(game);
    setShowResultModal(true);
  }, []);

  const handleSaveResult = useCallback(async (halftime: { home: number; away: number }, final: { home: number; away: number }) => {
    if (!selectedGameForResult) return;
    
    try {
      // 1. Update node in flow state local state
      handleUpdateNode(selectedGameForResult.id, {
        halftime_score: halftime,
        final_score: final
      });

      // 2. Save to backend Gameinfo/Gameresult records
      const dbIdPart = selectedGameForResult.id.split('-').pop();
      if (dbIdPart && !isNaN(parseInt(dbIdPart))) {
        await gamedayApi.updateGameResult(parseInt(dbIdPart), halftime, final);
      }

      setShowResultModal(false);
      setSelectedGameForResult(null);
      addNotification(t('ui:notification.resultSaved'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to save result', error);
      addNotification(t('ui:notification.resultSaveFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [selectedGameForResult, handleUpdateNode, addNotification, t]);

  const handleShowTeamSelection = useCallback((slotId: string, side: 'home' | 'away' | 'official') => {
    setTeamSelectionModalContext({ slotId, side });
    setShowTeamSelectionModal(true);
  }, []);

  const handleTeamSelected = useCallback((teamId: string) => {
    if (teamSelectionContext) {
      handleAssignTeam(teamSelectionContext.slotId, teamSelectionContext.side, teamId);
    }
    setShowTeamSelectionModal(false);
    setTeamSelectionModalContext(null);
  }, [teamSelectionContext, handleAssignTeam]);

  const handleSaveBulkResults = useCallback(async (results: Record<string, any>) => {
    if (!id) return;
    try {
      // results is Map<gameId, {home_fh, away_fh, home_final, away_final}>
      const updatePromises = Object.entries(results).map(([gameId, scores]) => {
        const halftime = { home: scores.home_fh, away: scores.away_fh };
        const final = { home: scores.home_final, away: scores.away_final };
        return gamedayApi.updateGameResult(parseInt(gameId), halftime, final);
      });
      
      await Promise.all(updatePromises);
      
      // Refresh results
      const updatedGames = await gamedayApi.getGamedayGames(parseInt(id));
      setGameResults(updatedGames);
      
      addNotification(t('ui:notification.resultsSaved'), 'success', t('ui:notification.title.success'));
    } catch (error) {
      console.error('Failed to save bulk results', error);
      addNotification(t('ui:notification.resultsSaveFailed'), 'danger', t('ui:notification.title.error'));
    }
  }, [id, setGameResults, addNotification, t]);

  if (!id) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{t('ui:error.gamedayNotFound')}</Alert>
      </Container>
    );
  }

  return (
    <div className="list-designer-app bg-light min-vh-100 pb-5">
      <FlowToolbar
        onImport={handleImport}
        onExport={handleExport}
        onExportTemplate={handleExportTemplate}
        onNotify={addNotification}
        canExport={ui?.canExport ?? false}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        stats={stats}
        gamedayStatus={metadata?.status}
        readOnly={isLocked}
      />

      <Container fluid className="px-4 mt-4">
        <Stack gap={4}>
          <GamedayMetadataAccordion
            metadata={metadata}
            onUpdate={handleUpdateMetadata}
            validationIssues={ui?.validationIssues}
            highlightedElement={ui?.highlightedElement}
            onHighlightElement={handleHighlightElement}
            saveTrigger={saveTrigger}
            readOnly={isLocked}
          />

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
            getTeamUsage={(teamId) => ({ count: 0, games: [] })} // TODO: Implement
            onAssignTeam={handleAssignTeam}
            onSwapTeams={handleSwapTeams}
            onAddGame={handleUpdateGameSlot}
            onAddGameToGameEdge={handleConnectTeam}
            onAddStageToGameEdge={handleConnectTeam}
            onRemoveEdgeFromSlot={handleRemoveEdgeFromSlot}
            onOpenResultModal={handleOpenResultModal}
            onGenerateTournament={onGenerateTournamentHandler}
            expandedFieldIds={ui?.expandedFieldIds || new Set()}
            expandedStageIds={ui?.expandedStageIds || new Set()}
            highlightedElement={ui?.highlightedElement}
            highlightedSourceGameId={ui?.highlightedSourceGameId}
            onDynamicReferenceClick={handleDynamicReferenceClick}
            onNotify={addNotification}
            onAddOfficials={() => handleAddGlobalTeam(t('domain:team.officials'))}
            resultsMode={resultsMode}
            gameResults={gameResults}
            onSaveBulkResults={handleSaveBulkResults}
            readOnly={isLocked}
          />
        </Stack>
      </Container>

      <TournamentGeneratorModal
        show={showTournamentModal}
        onHide={() => setShowTournamentModal(false)}
        onGenerate={handleGenerateTournament}
        teams={flowState.globalTeams}
      />

      <GameResultModal
        show={showResultModal}
        onHide={() => setShowResultModal(false)}
        game={selectedGameForResult}
        onSave={handleSaveResult}
      />

      <TeamSelectionModal
        show={showTeamSelectionModal}
        onHide={() => setShowTeamSelectionModal(false)}
        teams={flowState.globalTeams}
        groups={flowState.globalTeamGroups}
        onSelect={handleTeamSelected}
        title={teamSelectionContext?.side === 'official' ? t('ui:title.selectOfficial') : t('ui:title.selectTeam')}
      />

      <NotificationToast
        notifications={ui?.notifications || []}
        onDismiss={dismissNotification}
      />

      {ui?.isLoading && <LoadingOverlay message={t('ui:message.loading')} />}
    </div>
  );
};

export default ListDesignerApp;
