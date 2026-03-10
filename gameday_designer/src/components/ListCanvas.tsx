import React, { memo, useMemo, useState, useCallback } from 'react';
import { Card, Button, Accordion, Stack } from 'react-bootstrap';
import { 
  DesignerNode, 
  GameNode, 
  StageNode, 
  FieldNode, 
  isGameNode, 
  isStageNode, 
  isFieldNode,
  Team,
  TeamGroup,
  HighlightedElement
} from '../types/designer';
import { Edge } from '@xyflow/react';
import TeamPool from './list/TeamPool';
import FieldSection from './list/FieldSection';
import EmptyState from './list/EmptyState';
import GameResultsTable from './list/GameResultsTable';
import { useTypedTranslation } from '../i18n/i18n';

interface ListCanvasProps {
  nodes: DesignerNode[];
  edges: Edge[];
  globalTeams: Team[];
  globalTeamGroups: TeamGroup[];
  onUpdateNode: (id: string, data: Partial<import('../types/designer').GameData | import('../types/designer').StageData | import('../types/designer').FieldData>) => void;
  onDeleteNode: (id: string) => void;
  onAddField: () => void;
  onAddStage: (fieldId: string) => void;
  onSelectNode: (id: string | null) => void;
  onHighlightElement: (element: HighlightedElement | null) => void;
  selectedNodeId?: string | null;
  onAddGlobalTeam: (label: string, group?: string) => void;
  onUpdateGlobalTeam: (id: string, data: Partial<Team>) => void;
  onDeleteGlobalTeam: (id: string) => void;
  onReplaceGlobalTeam: (oldId: string, newId: string) => void;
  onReorderGlobalTeam: (id: string, newIndex: number) => void;
  onAddGlobalTeamGroup: () => void;
  onUpdateGlobalTeamGroup: (id: string, data: Partial<TeamGroup>) => void;
  onDeleteGlobalTeamGroup: (id: string) => void;
  onReorderGlobalTeamGroup: (id: string, newIndex: number) => void;
  onShowTeamSelection: (slotId: string, side: 'home' | 'away' | 'official') => void;
  getTeamUsage: (teamId: string) => { count: number; games: string[] };
  onAssignTeam: (slotId: string, side: 'home' | 'away' | 'official', teamId: string) => void;
  onSwapTeams: (slotId: string) => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceId: string, targetId: string, targetHandle: 'home' | 'away') => void;
  onAddStageToGameEdge: (sourceId: string, targetId: string, targetHandle: 'home' | 'away') => void;
  onRemoveEdgeFromSlot: (slotId: string, handle: 'home' | 'away') => void;
  onOpenResultModal: (game: GameNode) => void;
  onGenerateTournament: () => void;
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
            {t('ui:title.bulkResultsEntry')}
          </Card.Header>
          <Card.Body className="p-0">
            <GameResultsTable 
              results={gameResults} 
              onSave={onSaveBulkResults}
            />
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="list-canvas px-3">
        <Stack gap={3}>
          <Accordion activeKey={isTeamPoolExpanded ? '0' : undefined} className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header onClick={handleToggleTeamPool}>
                <Stack direction="horizontal" gap={2} className="w-100 me-3">
                  <i className="bi bi-people-fill text-primary" />
                  <span className="fw-bold">{t('ui:title.teamPool')}</span>
                  <div className="ms-auto">
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      onClick={handleAddGroupHeader}
                      disabled={readOnly}
                    >
                      <i className="bi bi-plus-lg me-1" />
                      {t('ui:button.addGroup')}
                    </Button>
                  </div>
                </Stack>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <TeamPool
                  teams={globalTeams}
                  groups={globalTeamGroups}
                  onAddTeam={onAddGlobalTeam}
                  onUpdateTeam={onUpdateGlobalTeam}
                  onDeleteTeam={onDeleteGlobalTeam}
                  onReplaceTeam={onReplaceGlobalTeam}
                  onReorderTeam={onReorderGlobalTeam}
                  onAddGroup={onAddGlobalTeamGroup}
                  onUpdateGroup={onUpdateGlobalTeamGroup}
                  onDeleteGroup={onDeleteGlobalTeamGroup}
                  onReorderGroup={onReorderGlobalTeamGroup}
                  onNotify={onNotify}
                  onAddOfficials={onAddOfficials}
                  readOnly={readOnly}
                />
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          <EmptyState onAddField={onAddField} onGenerateTournament={onGenerateTournament} readOnly={readOnly} />
        </Stack>
      </div>
    );
  }

  return (
    <div className="list-canvas px-3">
      <Stack gap={3}>
        <Accordion activeKey={isTeamPoolExpanded ? '0' : undefined}>
          <Accordion.Item eventKey="0">
            <Accordion.Header onClick={handleToggleTeamPool}>
              <Stack direction="horizontal" gap={2} className="w-100 me-3">
                <i className="bi bi-people-fill text-primary" />
                <span className="fw-bold">{t('ui:title.teamPool')}</span>
                <div className="ms-auto">
                  <Button 
                    size="sm" 
                    variant="outline-primary" 
                    onClick={handleAddGroupHeader}
                    disabled={readOnly}
                  >
                    <i className="bi bi-plus-lg me-1" />
                    {t('ui:button.addGroup')}
                  </Button>
                </div>
              </Stack>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <TeamPool
                teams={globalTeams}
                groups={globalTeamGroups}
                onAddTeam={onAddGlobalTeam}
                onUpdateTeam={onUpdateGlobalTeam}
                onDeleteTeam={onDeleteGlobalTeam}
                onReplaceTeam={onReplaceGlobalTeam}
                onReorderTeam={onReorderGlobalTeam}
                onAddGroup={onAddGlobalTeamGroup}
                onUpdateGroup={onUpdateGlobalTeamGroup}
                onDeleteGroup={onDeleteGlobalTeamGroup}
                onReorderGroup={onReorderGlobalTeamGroup}
                onNotify={onNotify}
                onAddOfficials={onAddOfficials}
                readOnly={readOnly}
              />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        <Stack gap={4} className="pb-5">
          {fields.map((field) => (
            <FieldSection
              key={field.id}
              field={field}
              stages={getFieldStagesMap.get(field.id) || []}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onAddStage={onAddStage}
              onSelectNode={onSelectNode}
              onHighlightElement={onHighlightElement}
              selectedNodeId={selectedNodeId}
              globalTeams={globalTeams}
              globalTeamGroups={globalTeamGroups}
              onShowTeamSelection={onShowTeamSelection}
              getTeamUsage={getTeamUsage}
              onAssignTeam={onAssignTeam}
              onSwapTeams={onSwapTeams}
              onAddGame={onAddGame}
              nodes={nodes}
              edges={edges}
              onAddGameToGameEdge={onAddGameToGameEdge}
              onAddStageToGameEdge={onAddStageToGameEdge}
              onRemoveEdgeFromSlot={onRemoveEdgeFromSlot}
              onOpenResultModal={onOpenResultModal}
              expandedFieldIds={expandedFieldIds}
              expandedStageIds={expandedStageIds}
              highlightedElement={highlightedElement}
              highlightedSourceGameId={highlightedSourceGameId}
              onDynamicReferenceClick={onDynamicReferenceClick}
              readOnly={readOnly}
            />
          ))}
          
          <div className="d-flex justify-content-center pt-2">
            <Button 
              variant="outline-primary" 
              className="px-4 py-2 border-dashed shadow-none hover-bg-light"
              onClick={onAddField}
              disabled={readOnly}
            >
              <i className="bi bi-plus-circle me-2" />
              {t('ui:button.addField')}
            </Button>
          </div>
        </Stack>
      </Stack>
    </div>
  );
});

ListCanvas.displayName = 'ListCanvas';

export default ListCanvas;
