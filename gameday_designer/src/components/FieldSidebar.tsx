/**
 * FieldSidebar Component
 *
 * Sidebar for managing playing fields.
 * Allows adding, removing, and renaming fields.
 */

import React, { useState } from 'react';
import { Card, ListGroup, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import type { FlowField, FlowNode } from '../types/flowchart';
import { isGameNode } from '../types/flowchart';

import './FieldSidebar.css';

/**
 * Props for the FieldSidebar component.
 */
export interface FieldSidebarProps {
  /** List of fields */
  fields: FlowField[];
  /** All nodes (used to count games per field) */
  nodes: FlowNode[];
  /** Callback to add a new field */
  onAddField: (name: string) => void;
  /** Callback to update a field */
  onUpdateField: (fieldId: string, name: string) => void;
  /** Callback to delete a field */
  onDeleteField: (fieldId: string) => void;
}

/**
 * FieldSidebar component.
 *
 * Manages the list of playing fields.
 */
const FieldSidebar: React.FC<FieldSidebarProps> = ({
  fields,
  nodes,
  onAddField,
  onUpdateField,
  onDeleteField,
}) => {
  const [newFieldName, setNewFieldName] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  /**
   * Count games assigned to a specific field.
   */
  const countGamesForField = (fieldId: string): number => {
    return nodes.filter(
      (node) =>
        isGameNode(node) &&
        node.data.fieldId === fieldId
    ).length;
  };

  /**
   * Count games with no field assigned.
   */
  const countUnassignedGames = (): number => {
    return nodes.filter(
      (node) =>
        isGameNode(node) &&
        node.data.fieldId === null
    ).length;
  };

  /**
   * Handle adding a new field.
   */
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFieldName.trim()) {
      onAddField(newFieldName.trim());
      setNewFieldName('');
    }
  };

  /**
   * Start editing a field name.
   */
  const handleStartEdit = (field: FlowField) => {
    setEditingFieldId(field.id);
    setEditingName(field.name);
  };

  /**
   * Save field name edit.
   */
  const handleSaveEdit = () => {
    if (editingFieldId && editingName.trim()) {
      onUpdateField(editingFieldId, editingName.trim());
    }
    setEditingFieldId(null);
    setEditingName('');
  };

  /**
   * Cancel field name edit.
   */
  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditingName('');
  };

  /**
   * Handle deleting a field.
   */
  const handleDeleteField = (fieldId: string, fieldName: string) => {
    const gameCount = countGamesForField(fieldId);
    let confirmMessage = `Delete field "${fieldName}"?`;

    if (gameCount > 0) {
      confirmMessage += ` This will unassign ${gameCount} game(s) from this field.`;
    }

    if (window.confirm(confirmMessage)) {
      onDeleteField(fieldId);
    }
  };

  const unassignedCount = countUnassignedGames();

  return (
    <Card className="field-sidebar" data-testid="field-sidebar">
      <Card.Header>
        <i className="bi bi-geo-alt-fill me-2"></i>
        Fields
      </Card.Header>
      <Card.Body className="p-0">
        {/* Add new field form */}
        <Form onSubmit={handleAddField} className="p-3 border-bottom">
          <InputGroup size="sm">
            <Form.Control
              type="text"
              placeholder="New field name..."
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              data-testid="new-field-input"
            />
            <Button
              type="submit"
              variant="success"
              disabled={!newFieldName.trim()}
              data-testid="add-field-button"
            >
              <i className="bi bi-plus-lg"></i>
            </Button>
          </InputGroup>
        </Form>

        {/* Fields list */}
        <ListGroup variant="flush">
          {fields.length === 0 ? (
            <ListGroup.Item className="text-muted text-center py-4">
              <i className="bi bi-info-circle me-2"></i>
              No fields defined. Add a field above.
            </ListGroup.Item>
          ) : (
            fields.map((field) => {
              const gameCount = countGamesForField(field.id);
              const isEditing = editingFieldId === field.id;

              return (
                <ListGroup.Item
                  key={field.id}
                  className="d-flex align-items-center justify-content-between"
                  data-testid={`field-item-${field.id}`}
                >
                  {isEditing ? (
                    <InputGroup size="sm" className="flex-grow-1 me-2">
                      <Form.Control
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button variant="success" onClick={handleSaveEdit}>
                        <i className="bi bi-check"></i>
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        <i className="bi bi-x"></i>
                      </Button>
                    </InputGroup>
                  ) : (
                    <>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-geo-alt me-2 text-secondary"></i>
                        <span>{field.name}</span>
                        <Badge bg="info" className="ms-2">
                          {gameCount} {gameCount === 1 ? 'game' : 'games'}
                        </Badge>
                      </div>
                      <div>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 me-2"
                          onClick={() => handleStartEdit(field)}
                          title="Rename field"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger"
                          onClick={() => handleDeleteField(field.id, field.name)}
                          title="Delete field"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </>
                  )}
                </ListGroup.Item>
              );
            })
          )}
        </ListGroup>

        {/* Unassigned games indicator */}
        {unassignedCount > 0 && (
          <div className="p-3 border-top bg-warning-subtle">
            <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
            <span className="text-muted small">
              {unassignedCount} {unassignedCount === 1 ? 'game has' : 'games have'} no field assigned
            </span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default FieldSidebar;
