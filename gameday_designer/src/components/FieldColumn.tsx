/**
 * FieldColumn Component
 *
 * Displays a single playing field with:
 * - Editable field name
 * - List of game slots (rendered as GameSlotCards)
 * - Add Game button
 * - Delete field button
 */

import React from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Field } from '../types/designer';
import GameSlotCard from './GameSlotCard';

export interface FieldColumnProps {
  /** The field data to display */
  field: Field;
  /** ID of the currently selected game slot (null if none) */
  selectedGameSlotId: string | null;
  /** Callback when field name is changed */
  onUpdateFieldName: (fieldId: string, name: string) => void;
  /** Callback when field is to be removed */
  onRemoveField: (fieldId: string) => void;
  /** Callback when Add Game button is clicked */
  onAddGameSlot: (fieldId: string) => void;
  /** Callback when a game slot is selected */
  onSelectGameSlot: (slotId: string) => void;
  /** Callback when a game slot is to be deleted */
  onDeleteGameSlot: (slotId: string) => void;
  /** Callback when a game slot is to be duplicated */
  onDuplicateGameSlot: (slotId: string) => void;
}

/**
 * FieldColumn component.
 * Displays a field with its game slots in a column layout.
 */
const FieldColumn: React.FC<FieldColumnProps> = ({
  field,
  selectedGameSlotId,
  onUpdateFieldName,
  onRemoveField,
  onAddGameSlot,
  onSelectGameSlot,
  onDeleteGameSlot,
  onDuplicateGameSlot,
}) => {
  /**
   * Handle field name change.
   */
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFieldName(field.id, event.target.value);
  };

  /**
   * Handle delete field button click.
   */
  const handleDeleteField = () => {
    onRemoveField(field.id);
  };

  /**
   * Handle add game button click.
   */
  const handleAddGame = () => {
    onAddGameSlot(field.id);
  };

  return (
    <Card className="field-column h-100">
      <Card.Header className="d-flex align-items-center gap-2">
        <Form.Control
          type="text"
          value={field.name}
          onChange={handleNameChange}
          aria-label="Field name"
          className="flex-grow-1"
          size="sm"
        />
        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleDeleteField}
          aria-label="Delete field"
          title="Delete field"
        >
          <i className="bi bi-x-lg"></i>
        </Button>
      </Card.Header>
      <Card.Body className="d-flex flex-column" style={{ minHeight: '300px' }}>
        {field.gameSlots.length === 0 ? (
          <div className="text-center text-muted py-4 flex-grow-1 d-flex align-items-center justify-content-center">
            <span>No games yet. Click "Add Game" to create one.</span>
          </div>
        ) : (
          <div className="game-slots-container flex-grow-1 overflow-auto">
            {field.gameSlots.map((slot) => (
              <GameSlotCard
                key={slot.id}
                gameSlot={slot}
                isSelected={selectedGameSlotId === slot.id}
                onSelect={onSelectGameSlot}
                onDelete={onDeleteGameSlot}
                onDuplicate={onDuplicateGameSlot}
              />
            ))}
          </div>
        )}
        <div className="mt-auto pt-2">
          <Button
            variant="outline-primary"
            className="w-100"
            onClick={handleAddGame}
            aria-label="Add game"
          >
            <i className="bi bi-plus-lg me-1"></i>
            Add Game
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default FieldColumn;
