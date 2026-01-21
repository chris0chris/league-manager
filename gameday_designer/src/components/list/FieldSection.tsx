/**
 * FieldSection Component
 *
 * Displays a collapsible field container with nested stage sections.
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Card, Button } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import StageSection from './StageSection';
import type { 
  FieldNode, 
  StageNode, 
  FlowNode, 
  FlowEdge, 
  GlobalTeam, 
  GlobalTeamGroup,
  HighlightedElement
} from '../../types/flowchart';
import { ICONS } from '../../utils/iconConstants';
import './FieldSection.css';

export interface FieldSectionProps {
  field: FieldNode;
  stages: StageNode[];
  allNodes: FlowNode[];
  edges: FlowEdge[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  highlightedElement?: HighlightedElement | null;
  onUpdate: (nodeId: string, data: Partial<FieldNode['data']>) => void;
  onDelete: (nodeId: string) => void;
  onAddStage: (fieldId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onAddStageToGameEdge: (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: 'home' | 'away') => void;
  onRemoveEdgeFromSlot: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  isExpanded: boolean;
  expandedStageIds: Set<string>;
  highlightedSourceGameId?: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
  onNotify?: (message: string, type: import('../../types/designer').NotificationType, title?: string) => void;
  readOnly?: boolean;
}

const FieldSection: React.FC<FieldSectionProps> = memo(({
  field,
  stages,
  allNodes,
  edges,
  globalTeams,
  globalTeamGroups,
  highlightedElement,
  onUpdate,
  onDelete,
  onAddStage,
  onSelectNode,
  selectedNodeId,
  onAssignTeam,
  onAddGame,
  onAddGameToGameEdge,
  onAddStageToGameEdge,
  onRemoveEdgeFromSlot,
  isExpanded: isExpandedProp,
  expandedStageIds,
  highlightedSourceGameId,
  onDynamicReferenceClick,
  onNotify,
  readOnly = false,
}) => {
  const { t } = useTypedTranslation(['ui']);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(field.data.name);
  const [localExpanded, setLocalExpanded] = useState(true);
  
  // Combine local state with prop (if prop is true, it overrides local state)
  const isExpanded = isExpandedProp || localExpanded;

  const sortedStages = useMemo(() => 
    [...stages].sort((a, b) => a.data.order - b.data.order),
    [stages]
  );

  const isSelected = selectedNodeId === field.id;
  const isHighlighted = highlightedElement?.id === field.id && highlightedElement?.type === 'field';

  const handleToggleExpand = useCallback(() => {
    setLocalExpanded((prev) => !prev);
  }, []);

  const handleAddStage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddStage(field.id);
    },
    [field.id, onAddStage]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(field.id);
    },
    [field.id, onDelete]
  );

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditedName(field.data.name);
  }, [field.data.name]);

  const handleSaveName = useCallback(() => {
    setIsEditingName(false);
    if (editedName.trim() !== '' && editedName !== field.data.name) {
      onUpdate(field.id, { name: editedName.trim() });
    } else {
      setEditedName(field.data.name);
    }
  }, [editedName, field.id, field.data.name, onUpdate]);

  const handleNameKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveName();
      } else if (e.key === 'Escape') {
        setIsEditingName(false);
        setEditedName(field.data.name);
      }
    },
    [handleSaveName, field.data.name]
  );

  const handleSelectField = useCallback(() => {
    onSelectNode(field.id);
  }, [field.id, onSelectNode]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onUpdate(field.id, { color: e.target.value });
  }, [field.id, onUpdate]);

  return (
    <Card
      id={`field-${field.id}`}
      className={`field-section mb-3 ${isSelected ? 'selected' : ''} ${isHighlighted ? 'element-highlighted' : ''}`}
      onClick={handleSelectField}
    >
      <Card.Header
        className="field-section__header d-flex align-items-center"
        onClick={handleToggleExpand}
        style={{
          cursor: 'pointer',
          borderLeft: `4px solid ${field.data.color || '#0dcaf0'}`,
        }}
      >
        <i className={`bi ${isExpanded ? ICONS.EXPANDED : ICONS.COLLAPSED} me-2`}></i>

        {isEditingName ? (
          <input
            type="text"
            className="form-control form-control-sm me-2 me-auto"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleNameKeyPress}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{ maxWidth: '200px' }}
          />
        ) : (
          <>
            <strong className="me-2">{field.data.name}</strong>
            {!readOnly && (
              <Button
                size="sm"
                variant="link"
                onClick={handleStartEdit}
                aria-label={t('ui:tooltip.editFieldName')}
                className="p-0 me-auto btn-adaptive"
                style={{ fontSize: '0.875rem' }}
                title={t('ui:tooltip.editFieldName')}
              >
                <i className={`bi ${ICONS.PENCIL_SMALL}`}></i>
                <span className="btn-label-adaptive">{t('ui:button.edit')}</span>
              </Button>
            )}
            {readOnly && <span className="me-auto" />}
          </>
        )}

        {!readOnly && (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={handleAddStage}
            aria-label={t('ui:button.addStage')}
            className="me-2 btn-adaptive"
            title={t('ui:tooltip.addStage')}
          >
            <i className={`bi ${ICONS.ADD}`}></i>
            <span className="btn-label-adaptive">{t('ui:button.addStage')}</span>
          </Button>
        )}

        <input
          type="color"
          value={field.data.color || '#d1ecf1'}
          onChange={handleColorChange}
          onClick={(e) => e.stopPropagation()}
          title={t('ui:tooltip.fieldColor')}
          className="me-2"
          style={{ width: '28px', height: '28px', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
          disabled={readOnly}
        />

        {!readOnly && (
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={handleDelete} 
            aria-label={t('ui:tooltip.deleteField')}
            className="btn-adaptive"
            title={t('ui:tooltip.deleteField')}
          >
            <i className={`bi ${ICONS.DELETE}`}></i>
          </Button>
        )}
      </Card.Header>

      {isExpanded && (
        <Card.Body className="field-section__body">
          {sortedStages.length === 0 ? (
            <div className="text-center py-4">
              <i className={`bi ${ICONS.STAGE} me-2`} style={{ fontSize: '2rem', opacity: 0.3 }}></i>
              <p className="text-muted mb-3">{t('ui:message.noStagesYet')}</p>
              {!readOnly && (
                <Button 
                  variant="outline-primary" 
                  onClick={handleAddStage} 
                  aria-label={t('ui:button.addStage')} 
                  className="btn-adaptive"
                  title={t('ui:tooltip.addStage')}
                >
                  <i className={`bi ${ICONS.ADD}`}></i>
                  <span className="btn-label-adaptive">{t('ui:button.addStage')}</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {sortedStages.map((stage) => (
                <StageSection
                  key={stage.id}
                  stage={stage}
                  allNodes={allNodes}
                  edges={edges}
                  globalTeams={globalTeams}
                  globalTeamGroups={globalTeamGroups}
                  highlightedElement={highlightedElement}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onSelectNode={onSelectNode}
                  selectedNodeId={selectedNodeId}
                  onAssignTeam={onAssignTeam}
                  onAddGame={onAddGame}
                  onAddGameToGameEdge={onAddGameToGameEdge}
                  onAddStageToGameEdge={onAddStageToGameEdge}
                  onRemoveEdgeFromSlot={onRemoveEdgeFromSlot}
                  isExpanded={expandedStageIds.has(stage.id)}
                  highlightedSourceGameId={highlightedSourceGameId}
                  onDynamicReferenceClick={onDynamicReferenceClick}
                  onNotify={onNotify}
                  readOnly={readOnly}
                />
              ))}
            </>
          )}
        </Card.Body>
      )}
    </Card>
  );
});

export default FieldSection;
