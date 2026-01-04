/**
 * StageSection Component
 *
 * Displays a collapsible stage container with game tables.
 * Part of the list-based UI for the Gameday Designer.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import GameTable from './GameTable';
import type { StageNode, FlowNode, FlowEdge, GameNode, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';
import { isGameNode } from '../../types/flowchart';
import './StageSection.css';

export interface StageSectionProps {
  /** The stage node to display */
  stage: StageNode;

  /** All nodes in the flowchart (for filtering games) */
  allNodes: FlowNode[];

  /** All edges in the flowchart */
  edges: FlowEdge[];

  /** Global team pool */
  globalTeams: GlobalTeam[];

  /** Global team groups */
  globalTeamGroups: GlobalTeamGroup[];

  /** Callback when stage data is updated */
  onUpdate: (nodeId: string, data: Partial<StageNode['data']>) => void;

  /** Callback when stage is deleted */
  onDelete: (nodeId: string) => void;

  /** Callback when a node is selected */
  onSelectNode: (nodeId: string | null) => void;

  /** Currently selected node ID */
  selectedNodeId: string | null;

  /** Callback to assign a team to a game */
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;

  /** Callback to add a game to this stage */
  onAddGame: (stageId: string) => void;

  /** Callback to add a GameToGameEdge */
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;

  /** Callback to remove a GameToGameEdge */
  onRemoveGameToGameEdge: (targetGameId: string, targetSlot: 'home' | 'away') => void;

  /** Whether this stage is expanded (controlled) */
  isExpanded: boolean;
}

/**
 * StageSection component.
 *
 * Renders a stage as a collapsible card with:
 * - Stage name (inline editable)
 * - Stage type badge
 * - Metadata (game count)
 * - Delete Stage button
 * - GameTable for games in this stage
 */
const StageSection: React.FC<StageSectionProps> = ({
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(stage.data.name);

  // Use local state but sync with prop when it changes (for programmatic expansion)
  const [localExpanded, setLocalExpanded] = useState(true);
  const isExpanded = isExpandedProp || localExpanded;

  // Sync with prop changes (when expanded programmatically)
  React.useEffect(() => {
    if (isExpandedProp) {
      setLocalExpanded(true);
    }
  }, [isExpandedProp]);

  // Filter games that belong to this stage
  const games = useMemo(
    () =>
      allNodes.filter(
        (node): node is GameNode =>
          isGameNode(node) && node.parentId === stage.id
      ),
    [allNodes, stage.id]
  );

  /**
   * Toggle stage expansion.
   */
  const handleToggleExpand = useCallback(() => {
    setLocalExpanded((prev) => !prev);
  }, []);

  /**
   * Handle Delete Stage button click.
   */
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(stage.id);
    },
    [stage.id, onDelete]
  );

  /**
   * Start editing stage name.
   */
  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditingName(true);
      setEditedName(stage.data.name);
    },
    [stage.data.name]
  );

  /**
   * Save edited stage name.
   */
  const handleSaveName = useCallback(() => {
    setIsEditingName(false);
    if (editedName.trim() !== '' && editedName !== stage.data.name) {
      onUpdate(stage.id, { name: editedName.trim() });
    } else {
      setEditedName(stage.data.name);
    }
  }, [editedName, stage.id, stage.data.name, onUpdate]);

  /**
   * Handle name input key press.
   */
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

  /**
   * Handle Add Game button click.
   */
  const handleAddGame = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddGame(stage.id);
    },
    [stage.id, onAddGame]
  );

  return (
    <Card
      className={`stage-section mb-2`}
    >
      <Card.Header
        className="stage-section__header d-flex align-items-center"
        onClick={handleToggleExpand}
        style={{
          cursor: 'pointer',
          borderLeft: `3px solid ${stage.data.color || '#0d6efd'}`,
        }}
      >
        <i
          className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} me-2`}
        ></i>

        {/* Start Time Input */}
        <div className="d-flex align-items-center gap-2 me-2">
          <Form.Label className="mb-0 text-muted small">Start:</Form.Label>
          <Form.Control
            type="time"
            size="sm"
            value={stage.data.startTime || ''}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate(stage.id, { startTime: e.target.value || undefined });
            }}
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
              aria-label="Edit stage name"
              className="p-0 me-auto"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-pencil"></i>
            </Button>
          </>
        )}

        {games.length > 0 && (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={handleAddGame}
            aria-label="Add Game"
            className="me-2"
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Game
          </Button>
        )}

        {/* Stage color picker */}
        <input
          type="color"
          value={stage.data.color || '#e7f3ff'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(stage.id, { color: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          title="Stage color"
          className="me-2"
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
        />

        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleDelete}
          aria-label="Delete Stage"
        >
          <i className="bi bi-trash"></i>
        </Button>
      </Card.Header>

      {isExpanded && (
        <Card.Body className="stage-section__body">
          {/* Games Section */}
          <div>
            <h6 className="text-uppercase text-muted mb-2">Games</h6>

            {games.length === 0 ? (
              <div className="text-center py-3">
                <i className="bi bi-trophy me-2"></i>
                <p className="text-muted mb-3">No games in this stage</p>
                <Button
                  variant="outline-primary"
                  onClick={handleAddGame}
                  aria-label="Add Game"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Game
                </Button>
              </div>
            ) : (
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
            )}
          </div>
        </Card.Body>
      )}
    </Card>
  );
};

export default StageSection;
