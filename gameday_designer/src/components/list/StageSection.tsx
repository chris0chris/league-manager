/**
 * StageSection Component
 *
 * Displays a collapsible stage container with game tables.
 */

import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import GameTable from './GameTable';
import type { 
  StageNode, 
  FlowNode, 
  FlowEdge, 
  GameNode, 
  GlobalTeam, 
  GlobalTeamGroup,
  HighlightedElement
} from '../../types/flowchart';
import { isGameNode } from '../../types/flowchart';
import { ICONS } from '../../utils/iconConstants';
import './StageSection.css';

export interface StageSectionProps {
  stage: StageNode;
  allNodes: FlowNode[];
  edges: FlowEdge[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  highlightedElement?: HighlightedElement | null;
  onUpdate: (nodeId: string, data: Partial<StageNode['data']>) => void;
  onDelete: (nodeId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onAddStageToGameEdge: (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: 'home' | 'away') => void;
  onRemoveEdgeFromSlot: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  isExpanded: boolean;
  highlightedSourceGameId?: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
}

const StageSection: React.FC<StageSectionProps> = memo(({
  stage,
  allNodes,
  edges,
  globalTeams,
  globalTeamGroups,
  highlightedElement,
  onUpdate,
  onDelete,
  onSelectNode,
  selectedNodeId,
  onAssignTeam,
  onAddGame,
  onAddGameToGameEdge,
  onAddStageToGameEdge,
  onRemoveEdgeFromSlot,
  isExpanded: isExpandedProp,
  highlightedSourceGameId,
  onDynamicReferenceClick,
}) => {
  const { t } = useTypedTranslation(['ui', 'domain']);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(stage.data.name);
  const [editedStageType, setEditedStageType] = useState(stage.data.stageType || 'STANDARD');
  const [localExpanded, setLocalExpanded] = useState(true);
  const editZoneRef = useRef<HTMLDivElement>(null);
  
  // Combine local state with prop
  const isExpanded = isExpandedProp || localExpanded;

  const games = useMemo(
    () =>
      allNodes.filter(
        (node): node is GameNode =>
          isGameNode(node) && node.parentId === stage.id
      ),
    [allNodes, stage.id]
  );

  const isHighlighted = highlightedElement?.id === stage.id && highlightedElement?.type === 'stage';

  const handleToggleExpand = useCallback(() => {
    setLocalExpanded((prev) => !prev);
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(stage.id);
    },
    [stage.id, onDelete]
  );

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditedName(stage.data.name);
      setEditedStageType(stage.data.stageType || 'STANDARD');
    },
    [stage.data.name, stage.data.stageType]
  );

  const handleSaveEdit = useCallback((e?: React.FocusEvent) => {
    // Smart Blur: Only save if focus moves outside the edit zone
    if (e?.relatedTarget && editZoneRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsEditing(false);
    const updates: Partial<StageNode['data']> = {};
    
    if (editedName.trim() !== '' && editedName !== stage.data.name) {
      updates.name = editedName.trim();
    }
    
    if (editedStageType !== stage.data.stageType) {
      updates.stageType = editedStageType;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(stage.id, updates);
    } else {
      setEditedName(stage.data.name);
      setEditedStageType(stage.data.stageType || 'STANDARD');
    }
  }, [editedName, editedStageType, stage.id, stage.data.name, stage.data.stageType, onUpdate]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditedName(stage.data.name);
        setEditedStageType(stage.data.stageType || 'STANDARD');
      }
    },
    [handleSaveEdit, stage.data.name, stage.data.stageType]
  );

  const handleAddGame = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddGame(stage.id);
    },
    [stage.id, onAddGame]
  );

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    onUpdate(stage.id, { startTime: value || undefined });
  }, [stage.id, onUpdate]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onUpdate(stage.id, { color: e.target.value });
  }, [stage.id, onUpdate]);

  return (
    <Card 
      id={`stage-${stage.id}`}
      className={`stage-section mb-2 ${isHighlighted ? 'element-highlighted' : ''}`}
    >
      <Card.Header
        className={`stage-section__header d-flex align-items-center ${isEditing ? 'stage-section__header--editing' : ''}`}
        onClick={handleToggleExpand}
        style={{
          cursor: 'pointer',
          borderLeft: `3px solid ${stage.data.color || '#0d6efd'}`,
        }}
      >
        <i className={`bi ${isExpanded ? ICONS.EXPANDED : ICONS.COLLAPSED} me-2`}></i>

        <div className="d-flex align-items-center gap-2 me-3">
          <Form.Label htmlFor={`stage-start-${stage.id}`} className="mb-0 text-muted small">{t('ui:label.start')}:</Form.Label>
          <Form.Control
            id={`stage-start-${stage.id}`}
            type="time"
            size="sm"
            value={stage.data.startTime || ''}
            onChange={handleTimeChange}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '110px' }}
          />
        </div>

        {isEditing ? (
          <div 
            ref={editZoneRef} 
            className="flex-grow-1 d-flex align-items-center gap-2"
            onBlur={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center gap-2 me-2">
              <Form.Label htmlFor={`stage-type-${stage.id}`} className="mb-0 text-muted small">{t('ui:label.type')}:</Form.Label>
              <Form.Select
                id={`stage-type-${stage.id}`}
                size="sm"
                value={editedStageType}
                onChange={(e) => setEditedStageType(e.target.value as 'STANDARD' | 'RANKING')}
                style={{ width: '140px' }}
              >
                <option value="STANDARD">{t('domain:stageTypeStandard')}</option>
                <option value="RANKING">{t('domain:stageTypeRanking')}</option>
              </Form.Select>
            </div>
            <div className="flex-grow-1 d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
                style={{ maxWidth: '300px' }}
              />
              <Button 
                size="sm" 
                variant="outline-success" 
                onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                className="p-1"
                title={t('ui:button.save')}
              >
                <i className="bi bi-check-lg"></i>
              </Button>
              <Button 
                size="sm" 
                variant="outline-secondary" 
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                className="p-1"
                title={t('ui:button.cancel')}
              >
                <i className="bi bi-x-lg"></i>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="me-3 small text-muted">
              {stage.data.stageType === 'RANKING' ? (
                <span className="badge bg-info text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-trophy-fill me-1"></i>
                  {t('domain:stageTypeRanking')}
                </span>
              ) : (
                <span className="badge bg-light text-dark border" style={{ fontSize: '0.85rem' }}>
                  {t('domain:stageTypeStandard')}
                </span>
              )}
            </div>
            <strong className="me-2">{stage.data.name}</strong>
            <Button 
              size="sm" 
              variant="link" 
              onClick={handleStartEdit} 
              aria-label={t('ui:tooltip.editStageName')} 
              className="p-0 me-auto btn-adaptive" 
              style={{ fontSize: '0.875rem' }}
              title={t('ui:tooltip.editStageName')}
            >
              <i className={`bi ${ICONS.PENCIL_SMALL}`}></i>
              <span className="btn-label-adaptive">{t('ui:button.edit')}</span>
            </Button>
          </>
        )}

        <Button 
          size="sm" 
          variant="outline-primary" 
          onClick={handleAddGame} 
          aria-label={t('ui:button.addGame')} 
          className="me-2 btn-adaptive"
          title={t('ui:tooltip.addGame')}
        >
          <i className={`bi ${ICONS.ADD} me-2`}></i>
          <span className="btn-label-adaptive">{t('ui:button.addGame')}</span>
        </Button>

        <input
          type="color"
          value={stage.data.color || '#e7f3ff'}
          onChange={handleColorChange}
          onClick={(e) => e.stopPropagation()}
          title={t('ui:tooltip.stageColor')}
          className="me-2"
          style={{ width: '28px', height: '28px', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
        />

        <Button 
          variant="outline-danger" 
          size="sm" 
          onClick={handleDelete} 
          aria-label={t('ui:tooltip.deleteStage')}
          className="btn-adaptive"
          title={t('ui:tooltip.deleteStage')}
        >
          <i className={`bi ${ICONS.DELETE}`}></i>
        </Button>
      </Card.Header>

      {isExpanded && (
        <Card.Body className="stage-section__body">
          <div>
            <h6 className="text-uppercase text-muted mb-2">{t('domain:games')}</h6>
            {games.length === 0 ? (
              <div className="text-center py-3">
                <i className={`bi ${ICONS.TOURNAMENT} me-2`} style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                <p className="text-muted mb-3">{t('ui:message.noGamesInStage')}</p>
                <Button 
                  variant="outline-primary" 
                  onClick={handleAddGame} 
                  aria-label={t('ui:button.addGame')} 
                  className="btn-adaptive"
                  title={t('ui:tooltip.addGame')}
                >
                  <i className={`bi ${ICONS.ADD} me-2`} />
                  <span className="btn-label-adaptive">{t('ui:button.addGame')}</span>
                </Button>
              </div>
            ) : (
              <>
                <GameTable
                  games={games}
                  edges={edges}
                  allNodes={allNodes}
                  globalTeams={globalTeams}
                  globalTeamGroups={globalTeamGroups}
                  highlightedElement={highlightedElement}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onSelectNode={onSelectNode}
                  selectedNodeId={selectedNodeId}
                  onAssignTeam={onAssignTeam}
                  onAddGameToGameEdge={onAddGameToGameEdge}
                  onAddStageToGameEdge={onAddStageToGameEdge}
                  onRemoveEdgeFromSlot={onRemoveEdgeFromSlot}
                  highlightedSourceGameId={highlightedSourceGameId}
                  onDynamicReferenceClick={onDynamicReferenceClick}
                />
              </>
            )}
          </div>
        </Card.Body>
      )}
    </Card>
  );
});

export default StageSection;