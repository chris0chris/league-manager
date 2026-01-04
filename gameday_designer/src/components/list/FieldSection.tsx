/**
 * FieldSection Component
 *
 * Displays a collapsible field container with nested stage sections.
 * Part of the list-based UI for the Gameday Designer.
 */

import React, { useState, useCallback } from 'react';
import { Card, Button } from 'react-bootstrap';
import StageSection from './StageSection';
import type { FieldNode, StageNode, FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';
import { isGameNode } from '../../types/flowchart';
import './FieldSection.css';

export interface FieldSectionProps {
  /** The field node to display */
  field: FieldNode;

  /** Stages belonging to this field */
  stages: StageNode[];

  /** All nodes in the flowchart (for counting games, etc.) */
  allNodes: FlowNode[];

  /** All edges in the flowchart */
  edges: FlowEdge[];

  /** Global team pool */
  globalTeams: GlobalTeam[];

  /** Global team groups */
  globalTeamGroups: GlobalTeamGroup[];

  /** Callback when field data is updated */
  onUpdate: (nodeId: string, data: Partial<FieldNode['data']>) => void;

  /** Callback when field is deleted */
  onDelete: (nodeId: string) => void;

  /** Callback when a new stage is added to this field */
  onAddStage: (fieldId: string) => void;

  /** Callback when a node is selected */
  onSelectNode: (nodeId: string | null) => void;

  /** Currently selected node ID */
  selectedNodeId: string | null;

  /** Callback to assign a team to a game */
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;

  /** Callback to add a game to a stage */
  onAddGame: (stageId: string) => void;

  /** Callback to add a GameToGameEdge */
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;

  /** Callback to remove a GameToGameEdge */
  onRemoveGameToGameEdge: (targetGameId: string, targetSlot: 'home' | 'away') => void;

  /** Whether this field is expanded (controlled) */
  isExpanded: boolean;

  /** Set of expanded stage IDs (controlled) */
  expandedStageIds: Set<string>;
}

/**
 * FieldSection component.
 *
 * Renders a field as a collapsible card with:
 * - Field name (inline editable)
 * - Metadata (stage count, game count)
 * - Add Stage button
 * - Delete Field button
 * - Nested StageSection components
 */
const FieldSection: React.FC<FieldSectionProps> = ({
  field,
  stages,
  allNodes,
  edges,
  globalTeams,
  globalTeamGroups,
  onUpdate,
  onDelete,
  onAddStage,
  onSelectNode,
  selectedNodeId,
  onAssignTeam,
  onAddGame,
  onAddGameToGameEdge,
  onRemoveGameToGameEdge,
  isExpanded: isExpandedProp,
  expandedStageIds,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(field.data.name);

  // Use local state but sync with prop when it changes (for programmatic expansion)
  const [localExpanded, setLocalExpanded] = useState(true);
  const isExpanded = isExpandedProp || localExpanded;

  // Sync with prop changes (when expanded programmatically)
  React.useEffect(() => {
    if (isExpandedProp) {
      setLocalExpanded(true);
    }
  }, [isExpandedProp]);

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.data.order - b.data.order);

  // Count total games in this field
  const gameCount = allNodes.filter(
    (node) =>
      isGameNode(node) &&
      stages.some((stage) => stage.id === node.parentId)
  ).length;

  const isSelected = selectedNodeId === field.id;

  /**
   * Toggle field expansion.
   */
  const handleToggleExpand = useCallback(() => {
    setLocalExpanded((prev) => !prev);
  }, []);

  /**
   * Handle Add Stage button click.
   */
  const handleAddStage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddStage(field.id);
    },
    [field.id, onAddStage]
  );

  /**
   * Handle Delete Field button click.
   */
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(field.id);
    },
    [field.id, onDelete]
  );

  /**
   * Start editing field name.
   */
  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditedName(field.data.name);
  }, [field.data.name]);

  /**
   * Save edited field name.
   */
  const handleSaveName = useCallback(() => {
    setIsEditingName(false);
    if (editedName.trim() !== '' && editedName !== field.data.name) {
      onUpdate(field.id, { name: editedName.trim() });
    } else {
      setEditedName(field.data.name);
    }
  }, [editedName, field.id, field.data.name, onUpdate]);

  /**
   * Handle name input key press.
   */
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

  /**
   * Select this field.
   */
  const handleSelectField = useCallback(() => {
    onSelectNode(field.id);
  }, [field.id, onSelectNode]);

  return (
    <Card
      className={`field-section mb-3 ${isSelected ? 'selected' : ''}`}
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
        <i
          className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} me-2`}
        ></i>

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
            <Button
              size="sm"
              variant="link"
              onClick={handleStartEdit}
              aria-label="Edit field name"
              className="p-0 me-auto"
              style={{ fontSize: '0.875rem' }}
            >
              <i className="bi bi-pencil"></i>
            </Button>
          </>
        )}

        {sortedStages.length > 0 && (
          <Button
            size="sm"
            variant="outline-primary"
            onClick={handleAddStage}
            aria-label="Add Stage"
            className="me-2"
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Stage
          </Button>
        )}

        {/* Field color picker */}
        <input
          type="color"
          value={field.data.color || '#d1ecf1'}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(field.id, { color: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          title="Field color"
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
          aria-label="Delete Field"
        >
          <i className="bi bi-trash"></i>
        </Button>
      </Card.Header>

      {isExpanded && (
        <Card.Body className="field-section__body">
          {sortedStages.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-layers me-2"></i>
              <p className="text-muted mb-3">No stages yet</p>
              <Button
                variant="outline-primary"
                onClick={handleAddStage}
                aria-label="Add Stage"
              >
                <i className="bi bi-plus-circle me-1"></i>
                Add Stage
              </Button>
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
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onSelectNode={onSelectNode}
                  selectedNodeId={selectedNodeId}
                  onAssignTeam={onAssignTeam}
                  onAddGame={onAddGame}
                  onAddGameToGameEdge={onAddGameToGameEdge}
                  onRemoveGameToGameEdge={onRemoveGameToGameEdge}
                  isExpanded={expandedStageIds.has(stage.id)}
                />
              ))}
            </>
          )}
        </Card.Body>
      )}
    </Card>
  );
};

export default FieldSection;
