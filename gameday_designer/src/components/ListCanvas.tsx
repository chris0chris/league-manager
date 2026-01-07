/**
 * ListCanvas Component
 *
 * Main container for the list-based UI that displays the global team pool
 * and fields with their nested stages/games.
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import GlobalTeamTable from './list/GlobalTeamTable';
import FieldSection from './list/FieldSection';
import type { FlowNode, FlowEdge, FieldNode, StageNode, GlobalTeam, GlobalTeamGroup } from '../types/flowchart';
import { isFieldNode, isStageNode } from '../types/flowchart';
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
  selectedNodeId: string | null;
  onAddGlobalTeam: (groupId: string) => void;
  onUpdateGlobalTeam: (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => void;
  onDeleteGlobalTeam: (teamId: string) => void;
  onReorderGlobalTeam: (teamId: string, direction: 'up' | 'down') => void;
  onAddGlobalTeamGroup: () => void;
  onUpdateGlobalTeamGroup: (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => void;
  onDeleteGlobalTeamGroup: (groupId: string) => void;
  onReorderGlobalTeamGroup: (groupId: string, direction: 'up' | 'down') => void;
  getTeamUsage: (teamId: string) => { gameId: string; slot: 'home' | 'away' }[];
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onRemoveGameToGameEdge: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  expandedFieldIds: Set<string>;
  expandedStageIds: Set<string>;
  highlightedSourceGameId: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
}

const ListCanvas: React.FC<ListCanvasProps> = memo(({
  nodes,
  edges,
  globalTeams,
  globalTeamGroups,
  onUpdateNode,
  onDeleteNode,
  onAddField,
  onAddStage,
  onSelectNode,
  selectedNodeId,
  onAddGlobalTeam,
  onUpdateGlobalTeam,
  onDeleteGlobalTeam,
  onReorderGlobalTeam,
  onAddGlobalTeamGroup,
  onUpdateGlobalTeamGroup,
  onDeleteGlobalTeamGroup,
  onReorderGlobalTeamGroup,
  getTeamUsage,
  onAssignTeam,
  onAddGame,
  onAddGameToGameEdge,
  onRemoveGameToGameEdge,
  expandedFieldIds,
  expandedStageIds,
}) => {
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
    // Sort stages within each field
    map.forEach(stages => stages.sort((a, b) => a.data.order - b.data.order));
    return map;
  }, [nodes]);

  const handleAddGroupHeader = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddGlobalTeamGroup();
  }, [onAddGlobalTeamGroup]);

  return (
    <Container fluid className="list-canvas h-100">
      <Row className="list-canvas__content h-100 g-3">
        <Col md={isTeamPoolExpanded ? 3 : 'auto'} className={`teams-column ${!isTeamPoolExpanded ? 'teams-column--collapsed' : ''}`}>
          <Card
            className={`team-pool-card ${!isTeamPoolExpanded ? 'team-pool-card--collapsed' : ''}`}
            onClick={!isTeamPoolExpanded ? handleToggleTeamPool : undefined}
            style={{ cursor: !isTeamPoolExpanded ? 'pointer' : 'default' }}
          >
            {isTeamPoolExpanded ? (
              <>
                <Card.Header className="d-flex align-items-center" onClick={handleToggleTeamPool} style={{ cursor: 'pointer' }}>
                  <i className="bi bi-chevron-left me-2" />
                  <i className="bi bi-people-fill me-2" />
                  <strong>{t('ui:label.teamPool')}</strong>
                  {globalTeamGroups.length > 0 && (
                    <Button size="sm" variant="outline-primary" onClick={handleAddGroupHeader} className="ms-auto">
                      <i className="bi bi-plus-circle me-1" />
                      {t('ui:button.addGroup')}
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  <GlobalTeamTable
                    teams={globalTeams}
                    groups={globalTeamGroups}
                    onAddGroup={onAddGlobalTeamGroup}
                    onUpdateGroup={onUpdateGlobalTeamGroup}
                    onDeleteGroup={onDeleteGlobalTeamGroup}
                    onReorderGroup={onReorderGlobalTeamGroup}
                    onAddTeam={onAddGlobalTeam}
                    onUpdate={onUpdateGlobalTeam}
                    onDelete={onDeleteGlobalTeam}
                    onReorder={onReorderGlobalTeam}
                    getTeamUsage={getTeamUsage}
                    allNodes={nodes}
                  />
                </Card.Body>
              </>
            ) : (
              <div className="team-pool-sidebar">
                <i className="bi bi-people-fill mb-2" />
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
          <Card className="fields-card">
            <Card.Header className="d-flex align-items-center">
              <i className="bi bi-geo-alt-fill me-2" />
              <strong>{t('ui:label.fields')}</strong>
              {fields.length > 0 && (
                <Button size="sm" variant="outline-primary" onClick={onAddField} className="ms-auto">
                  <i className="bi bi-plus-circle me-1" />
                  {t('ui:button.addField')}
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {fields.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-geo-alt" style={{ fontSize: '4rem', opacity: 0.3 }} />
                  <h3 className="mt-3">{t('ui:message.noFieldsYet')}</h3>
                  <Button variant="outline-primary" onClick={onAddField}>
                    <i className="bi bi-plus-circle me-1" />
                    {t('ui:button.addField')}
                  </Button>
                </div>
              ) : (
                <div className="fields-grid">
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
                      selectedNodeId={selectedNodeId}
                      onAssignTeam={onAssignTeam}
                      onAddGame={onAddGame}
                      onAddGameToGameEdge={onAddGameToGameEdge}
                      onRemoveGameToGameEdge={onRemoveGameToGameEdge}
                      isExpanded={expandedFieldIds.has(field.id)}
                      expandedStageIds={expandedStageIds}
                    />
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
});

export default ListCanvas;