/**
 * ListCanvas Component
 *
 * Main container for the list-based UI that displays the global team pool
 * and fields with their nested stages/games.
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import GlobalTeamTable from './list/GlobalTeamTable';
import FieldSection from './list/FieldSection';
import { GameResultsTable } from './GameResultsTable';
import type { FlowNode, FlowEdge, FieldNode, StageNode, GlobalTeam, GlobalTeamGroup } from '../types/flowchart';
import { isFieldNode, isStageNode } from '../types/flowchart';
import { ICONS } from '../utils/iconConstants';
import './ListCanvas.css';

export interface ListCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddField: () => void;
  onAddStage: (fieldId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onHighlightElement: (id: string, type: import('../types/flowchart').HighlightedElement['type']) => void;
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
  onGenerateTournament?: () => void;
  expandedFieldIds: Set<string>;
  expandedStageIds: Set<string>;
  highlightedElement?: HighlightedElement | null;
  highlightedSourceGameId?: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
  onNotify?: (message: string, type: import('../types/designer').NotificationType, title?: string) => void;
  onAddOfficials?: () => void;
  resultsMode?: boolean;
  gameResults?: import('../types/designer').GameResultsDisplay[];
  onSaveBulkResults?: (results: Record<string, unknown>) => Promise<void>;
  readOnly?: boolean;
}

const ListCanvas: React.FC<ListCanvasProps> = memo((props) => {
  const {
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
    onGenerateTournament,
    expandedFieldIds,
    expandedStageIds,
    highlightedElement,
    highlightedSourceGameId,
    onDynamicReferenceClick,
    onNotify,
    onAddOfficials,
    resultsMode = false,
    gameResults = [],
    onSaveBulkResults,
    readOnly = false,
  } = props;

  const { t } = useTypedTranslation(['ui']);
  const [isTeamPoolExpanded, setIsTeamPoolExpanded] = useState(true);

  const handleToggleTeamPool = useCallback(() => {
    setIsTeamPoolExpanded((prev) => !prev);
  }, []);

  const fields = useMemo(() => 
    nodes
      .filter((node): node is FieldNode => isFieldNode(node))
      .sort((a, b) => a.data.order - b.data.order),
    [nodes]
  );

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

  const handleAddGroupHeader = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddGlobalTeamGroup();
  }, [onAddGlobalTeamGroup]);

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
      <Row className="list-canvas__content g-3">
        <Col md={isTeamPoolExpanded ? 3 : 'auto'} className={`teams-column ${!isTeamPoolExpanded ? 'teams-column--collapsed' : ''}`}>
          <Card
            id="team-team-pool"
            className={`team-pool-card ${!isTeamPoolExpanded ? 'team-pool-card--collapsed' : ''} ${highlightedElement?.id === 'team-pool' ? 'is-highlighted' : ''}`}
            onClick={!isTeamPoolExpanded ? handleToggleTeamPool : undefined}
            style={{ cursor: !isTeamPoolExpanded ? 'pointer' : 'default' }}
            data-testid="team-pool-card"
          >
            {isTeamPoolExpanded ? (
              <>
                <Card.Header className="d-flex align-items-center" onClick={handleToggleTeamPool} style={{ cursor: 'pointer' }}>
                  <i className={`bi ${ICONS.COLLAPSED} me-2`} />
                  <i className={`bi ${ICONS.TEAM} me-2`} />
                  <strong>{t('ui:label.teamPool')}</strong>
                  {!readOnly && (
                    <div className="ms-auto d-flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        onClick={handleAddGroupHeader} 
                        className="btn-adaptive"
                        title={t('ui:tooltip.addGroup')}
                      >
                        <i className={`bi ${ICONS.ADD} me-2`} />
                        <span className="btn-label-adaptive">{t('ui:button.addGroup')}</span>
                      </Button>
                      {onAddOfficials && (
                        <Button 
                          size="sm" 
                          variant="outline-secondary" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddOfficials();
                          }} 
                          title={t('ui:tooltip.addExternalOfficials')}
                          data-testid="add-officials-button"
                        >
                          <i className="bi bi-person-badge" />
                        </Button>
                      )}
                    </div>
                  )}
                </Card.Header>
                <Card.Body>
                  <GlobalTeamTable
                    teams={globalTeams}
                    groups={globalTeamGroups}
                    highlightedElement={highlightedElement}
                    onAddGroup={onAddGlobalTeamGroup}
                    onUpdateGroup={onUpdateGlobalTeamGroup}
                    onDeleteGroup={onDeleteGlobalTeamGroup}
                    onReorderGroup={onReorderGlobalTeamGroup}
                    onAddTeam={onAddGlobalTeam}
                    onUpdate={onUpdateGlobalTeam}
                    onDelete={onDeleteGlobalTeam}
                    onReplace={onReplaceGlobalTeam}
                    onReorder={onReorderGlobalTeam}
                    onShowTeamSelection={onShowTeamSelection}
                    getTeamUsage={getTeamUsage}
                    allNodes={nodes}
                    readOnly={readOnly}
                  />
                </Card.Body>
              </>
            ) : (
              <div className="team-pool-sidebar">
                <i className={`bi ${ICONS.TEAM} mb-2`} />
                {globalTeamGroups.length > 0 && (
                  <div className="team-pool-sidebar__indicators">
                    <span className="badge bg-primary">{globalTeamGroups.length}</span>
                    <span className="badge bg-secondary">{globalTeams.length}</span>
                  </div>
                )}
                <div className="team-pool-sidebar__title">{t('ui:label.teamPool')}</div>
              </div>
            )}
          </Card>
        </Col>

        <Col md={isTeamPoolExpanded ? 9 : true} className="fields-column">
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
                        onClick={() => onGenerateTournament?.()} 
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
        </Col>
      </Row>
    </div>
  );
});

export default ListCanvas;
