/**
 * StageSection Component
 *
 * Displays a collapsible stage container with game tables.
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import GameTable from './GameTable';
import type { StageNode, FlowNode, FlowEdge, GameNode, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';
import { isGameNode } from '../../types/flowchart';
import { ICONS } from '../../utils/iconConstants';
import './StageSection.css';

export interface StageSectionProps {
  stage: StageNode;
  allNodes: FlowNode[];
  edges: FlowEdge[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  onUpdate: (nodeId: string, data: Partial<StageNode['data']>) => void;
  onDelete: (nodeId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onAddGame: (stageId: string) => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onRemoveGameToGameEdge: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  isExpanded: boolean;
}

const StageSection: React.FC<StageSectionProps> = memo(({
  stage,
  allNodes,
  edges,
  globalTeams,
  globalTeamGroups,
  onUpdate,
  onDelete,
  onSelectNode,
  selectedNodeId,
  onAssignTeam,
  onAddGame,
  onAddGameToGameEdge,
  onRemoveGameToGameEdge,
  isExpanded: isExpandedProp,
}) => {
  const { t } = useTypedTranslation(['ui', 'domain']);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(stage.data.name);
  const [localExpanded, setLocalExpanded] = useState(true);
  
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
      setIsEditingName(true);
      setEditedName(stage.data.name);
    },
    [stage.data.name]
  );

  const handleSaveName = useCallback(() => {
    setIsEditingName(false);
    if (editedName.trim() !== '' && editedName !== stage.data.name) {
      onUpdate(stage.id, { name: editedName.trim() });
    } else {
      setEditedName(stage.data.name);
    }
  }, [editedName, stage.id, stage.data.name, onUpdate]);

  const handleNameKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveName();
      } else if (e.key === 'Escape') {
        setIsEditingName(false);
        setEditedName(stage.data.name);
      }
    },
    [handleSaveName, stage.data.name]
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
    onUpdate(stage.id, { startTime: e.target.value || undefined });
  }, [stage.id, onUpdate]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onUpdate(stage.id, { color: e.target.value });
  }, [stage.id, onUpdate]);

  return (
    <Card className="stage-section mb-2">
      <Card.Header
        className="stage-section__header d-flex align-items-center"
        onClick={handleToggleExpand}
        style={{
          cursor: 'pointer',
          borderLeft: `3px solid ${stage.data.color || '#0d6efd'}`,
        }}
      >
        <i className={`bi ${isExpanded ? ICONS.EXPANDED : ICONS.COLLAPSED} me-2`}></i>

        <div className="d-flex align-items-center gap-2 me-2">
          <Form.Label className="mb-0 text-muted small">{t('ui:label.start')}:</Form.Label>
          <Form.Control
            type="time"
            size="sm"
            value={stage.data.startTime || ''}
            onChange={handleTimeChange}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '110px' }}
          />
        </div>

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
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onSelectNode={onSelectNode}
                  selectedNodeId={selectedNodeId}
                  onAssignTeam={onAssignTeam}
                  onAddGameToGameEdge={onAddGameToGameEdge}
                  onRemoveGameToGameEdge={onRemoveGameToGameEdge}
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
