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
import { useTypedTranslation } from '../i18n/useTypedTranslation';

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
  const { t } = useTypedTranslation(['ui']);

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
          aria-label={t('ui:label.fieldName')}
          className="flex-grow-1"
          size="sm"
        />
        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleDeleteField}
          aria-label={t('ui:tooltip.deleteField')}
          title={t('ui:tooltip.deleteField')}
        >
          <i className="bi bi-x-lg"></i>
        </Button>
      </Card.Header>
      <Card.Body className="d-flex flex-column" style={{ minHeight: '300px' }}>
        {field.gameSlots.length === 0 ? (
          <div className="text-center text-muted py-4 flex-grow-1 d-flex align-items-center justify-content-center">
            <span>{t('ui:message.noGamesYet')}</span>
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
            aria-label={t('ui:button.addGame')}
          >
            <i className="bi bi-plus-lg me-1"></i>
            {t('ui:button.addGame')}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default FieldColumn;
