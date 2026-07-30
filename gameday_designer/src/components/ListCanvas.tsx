/**
 * ListCanvas Component
 *
 * Main container for the list-based UI that displays the global team pool
 * and fields with their nested stages/games.
 */

import React, { useMemo } from 'react';
import { Card, Button } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import FieldSection from './list/FieldSection';
import { GameResultsTable } from './GameResultsTable';
import MetadataTeamPoolRow from './MetadataTeamPoolRow';
import type { FlowNode, FlowEdge, StageNode, GlobalTeam, GlobalTeamGroup, GamedayMetadata, FlowValidationResult, HighlightedElement } from '../types/flowchart';
import { isStageNode, getFieldNodes } from '../types/flowchart';
import { ICONS } from '../utils/iconConstants';
import './ListCanvas.css';

export interface ListCanvasProps {
  gamedayId?: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddField: () => void;
  onAddStage: (fieldId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onHighlightElement: (id: string, type: HighlightedElement['type']) => void;
  selectedNodeId: string | null;
  onAddGlobalTeam: (groupId: string) => void;
  onUpdateGlobalTeam: (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => void;
  onDeleteGlobalTeam: (teamId: string) => void;
  onReplaceGlobalTeam: (teamId: string, newTeam: { id: number; text: string }) => void;
  onReorderGlobalTeam: (teamId: string, direction: 'up' | 'down') => void;
  onAddGlobalTeamGroup: () => void;
  onUpdateGlobalTeamGroup: (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => void;
  onDeleteGlobalTeamGroup: (groupId: string) => void;
  onReorderGlobalTeamGroup: (groupId: string, direction: 'up' | 'down') => void;
  onShowTeamSelection: (id: string, mode?: 'group' | 'replace' | 'official') => void;
  getTeamUsage: (teamId: string) => { gameId: string; slot: 'home' | 'away' }[];
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onSwapTeams: (gameId: string) => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onAddStageToGameEdge: (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: 'home' | 'away', sourceGroup?: string) => void;
  onRemoveEdgeFromSlot: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  onOpenResultModal: (gameId: string) => void;
  onOpenTemplates?: () => void;
  expandedFieldIds: Set<string>;
  expandedStageIds: Set<string>;
  highlightedElement?: HighlightedElement | null;
  highlightedSourceGameId?: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
  onNotify?: (message: string, type: import('../types/designer').NotificationType, title?: string) => void;
  onAutoAssignOfficials?: () => void;
  isAutoAssigning?: boolean;
  onAddOfficials?: () => void;
  resultsMode?: boolean;
  gameResults?: import('../types/designer').GameResultsDisplay[];
  onSaveBulkResults?: (results: Record<string, unknown>) => Promise<void>;
  readOnly?: boolean;
  // Metadata + Team Pool Row props
  metadata: GamedayMetadata;
  onUpdateMetadata: (data: Partial<GamedayMetadata>) => void;
  onClearAll: () => void;
  onDeleteGameday: () => void;
  onPublishGameday: () => void;
  onUnlockGameday: () => Promise<void>;
  validation: FlowValidationResult;
  isRowCollapsed: boolean;
}

const ListCanvas: React.FC<ListCanvasProps> = (props) => {
  const {
    gamedayId,
    nodes,
    edges,
    globalTeams,
    globalTeamGroups,
    onUpdateNode,
    onDeleteNode,
    onAddField,
    onAddStage,
    onSelectNode,
    onHighlightElement,
    selectedNodeId,
    onAddGlobalTeam,
    onUpdateGlobalTeam,
    onDeleteGlobalTeam,
    onReplaceGlobalTeam,
    onReorderGlobalTeam,
    onAddGlobalTeamGroup,
    onUpdateGlobalTeamGroup,
    onDeleteGlobalTeamGroup,
    onReorderGlobalTeamGroup,
    onShowTeamSelection,
    getTeamUsage,
    onAssignTeam,
    onSwapTeams,
    onAddGame,
    onAddGameToGameEdge,
    onAddStageToGameEdge,
    onRemoveEdgeFromSlot,
    onOpenResultModal,
    onOpenTemplates,
    expandedFieldIds,
    expandedStageIds,
    highlightedElement,
    highlightedSourceGameId,
    onDynamicReferenceClick,
    onNotify,
    onAutoAssignOfficials,
    isAutoAssigning = false,
    onAddOfficials,
    resultsMode = false,
    gameResults = [],
    onSaveBulkResults,
    readOnly = false,
    metadata,
    onUpdateMetadata,
    onClearAll,
    onDeleteGameday,
    onPublishGameday,
    onUnlockGameday,
    validation,
    isRowCollapsed,
  } = props;

  const { t } = useTypedTranslation(['ui']);

  const fields = useMemo(() => getFieldNodes(nodes), [nodes]);

  const getFieldStagesMap = useMemo(() => {
    const map = new Map<string, StageNode[]>();
    nodes.filter(isStageNode).forEach(stage => {
      if (stage.parentId) {
        if (!map.has(stage.parentId)) map.set(stage.parentId, []);
        map.get(stage.parentId)!.push(stage as StageNode);
      }
    });
    map.forEach(stages => stages.sort((a, b) => a.data.order - b.data.order));
    return map;
  }, [nodes]);

  if (resultsMode) {
    return (
      <div className="list-canvas px-3">
        <Card className="shadow-sm">
          <Card.Header className="bg-white">
            <i className="bi bi-table me-2" />
            <strong>{t('ui:label.gameResults')}</strong>
          </Card.Header>
          <Card.Body>
            <GameResultsTable 
              games={gameResults} 
              onSave={onSaveBulkResults || (async () => {})} 
            />
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="list-canvas px-3">
      <div className="list-canvas__content">
        {/* Metadata + Team Pool Row */}
        <MetadataTeamPoolRow
          metadata={metadata}
          gamedayId={gamedayId}
          onUpdateMetadata={onUpdateMetadata}
          onClearAll={onClearAll}
          onDeleteGameday={onDeleteGameday}
          onPublishGameday={onPublishGameday}
          onUnlockGameday={onUnlockGameday}
          validation={validation}
          onHighlightElement={onHighlightElement}
          highlightedElement={highlightedElement}
          readOnly={readOnly}
          hasData={(nodes.length > 0 || globalTeams.length > 0)}
          isCollapsed={isRowCollapsed}
          globalTeams={globalTeams}
          globalTeamGroups={globalTeamGroups}
          allNodes={nodes}
          onAddGlobalTeam={onAddGlobalTeam}
          onUpdateGlobalTeam={onUpdateGlobalTeam}
          onDeleteGlobalTeam={onDeleteGlobalTeam}
          onReplaceGlobalTeam={onReplaceGlobalTeam}
          onReorderGlobalTeam={onReorderGlobalTeam}
          onAddGlobalTeamGroup={onAddGlobalTeamGroup}
          onUpdateGlobalTeamGroup={onUpdateGlobalTeamGroup}
          onDeleteGlobalTeamGroup={onDeleteGlobalTeamGroup}
          onReorderGlobalTeamGroup={onReorderGlobalTeamGroup}
          onShowTeamSelection={onShowTeamSelection}
          getTeamUsage={getTeamUsage}
          onAddOfficials={onAddOfficials}
        />

        {/* Fields Card - Full width below team pool */}
        <Card
          id="field-fields-card"
          className={`fields-card ${highlightedElement?.id === 'fields-card' ? 'is-highlighted' : ''}`}
        >
          <Card.Header className="d-flex align-items-center">
            <i className={`bi ${ICONS.FIELD} me-2`} />
            <strong>{t('ui:label.fields')}</strong>
            {!readOnly && (
              <div className="ms-auto d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={onAddField}
                  className="btn-adaptive"
                  title={t('ui:tooltip.addField')}
                  data-testid="add-field-button"
                >
                  <i className={`bi ${ICONS.ADD} me-2`} />
                  <span className="btn-label-adaptive">{t('ui:button.addField')}</span>
                </Button>
                {onAutoAssignOfficials && (
                  <Button
                    size="sm"
                    variant="outline-info"
                    onClick={onAutoAssignOfficials}
                    disabled={!(nodes.length > 0 || globalTeams.length > 0) || metadata.status !== 'DRAFT' || isAutoAssigning}
                    data-testid="auto-assign-officials-button"
                  >
                    <i className="bi bi-people me-2" />
                    {isAutoAssigning ? t('ui:message.loading') : t('ui:button.autoAssignOfficials')}
                  </Button>
                )}
              </div>
            )}
          </Card.Header>
          <Card.Body>
            {fields.length === 0 ? (
              <div className="text-center py-5">
                <i className={`bi ${ICONS.FIELD}`} style={{ fontSize: '4rem', opacity: 0.3 }} />
                <h3 className="mt-3">{t('ui:message.noFieldsYet')}</h3>
                <p className="text-muted mb-3">{t('ui:message.createFirstField')}</p>
                {!readOnly && (
                  <div className="d-flex justify-content-center gap-3">
                    <Button
                      variant="outline-success"
                      onClick={() => onOpenTemplates?.()}
                      className="btn-adaptive px-4"
                      title={t('ui:tooltip.generateTournament')}
                    >
                      <i className={`bi bi-magic me-2`} />
                      <span className="btn-label-adaptive">{t('ui:button.generateTournament')}</span>
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={onAddField}
                      className="btn-adaptive px-4"
                      title={t('ui:tooltip.addField')}
                    >
                      <i className={`bi ${ICONS.ADD} me-2`} />
                      <span className="btn-label-adaptive">{t('ui:button.addField')}</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="fields-grid compact-actions">
                {fields.map((field) => (
                  <FieldSection
                    key={field.id}
                    field={field}
                    stages={getFieldStagesMap.get(field.id) || []}
                    allNodes={nodes}
                    edges={edges}
                    globalTeams={globalTeams}
                    globalTeamGroups={globalTeamGroups}
                    onUpdate={onUpdateNode}
                    onDelete={onDeleteNode}
                    onAddStage={onAddStage}
                    onSelectNode={onSelectNode}
                    onHighlightElement={onHighlightElement}
                    selectedNodeId={selectedNodeId}
                    onAssignTeam={onAssignTeam}
                    onSwapTeams={onSwapTeams}
                    onAddGame={onAddGame}
                    onAddGameToGameEdge={onAddGameToGameEdge}
                    onAddStageToGameEdge={onAddStageToGameEdge}
                    onRemoveEdgeFromSlot={onRemoveEdgeFromSlot}
                    onOpenResultModal={onOpenResultModal}
                    isExpanded={expandedFieldIds?.has?.(field.id)}
                    expandedStageIds={expandedStageIds}
                    highlightedElement={highlightedElement}
                    highlightedSourceGameId={highlightedSourceGameId}
                    onDynamicReferenceClick={onDynamicReferenceClick}
                    onNotify={onNotify}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default ListCanvas;
