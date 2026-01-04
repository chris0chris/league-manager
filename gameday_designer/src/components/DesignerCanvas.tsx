/**
 * DesignerCanvas Component
 *
 * Main container for the Gameday Designer that:
 * - Shows all fields in responsive columns
 * - Renders FieldColumn for each field
 * - Shows empty state message when no fields
 */

import React from 'react';
import { Row, Col, Alert } from 'react-bootstrap';
import type { Field } from '../types/designer';
import FieldColumn from './FieldColumn';

export interface DesignerCanvasProps {
  /** All fields to display */
  fields: Field[];
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
 * DesignerCanvas component.
 * Main container that displays all fields in a responsive column layout.
 */
const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  fields,
  selectedGameSlotId,
  onUpdateFieldName,
  onRemoveField,
  onAddGameSlot,
  onSelectGameSlot,
  onDeleteGameSlot,
  onDuplicateGameSlot,
}) => {
  // Show empty state when no fields
  if (fields.length === 0) {
    return (
      <Alert variant="info" className="text-center">
        <Alert.Heading>No fields yet</Alert.Heading>
        <p>Click "Add Field" in the toolbar to create your first playing field.</p>
      </Alert>
    );
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <Row className="g-3">
      {sortedFields.map((field) => (
        <Col
          key={field.id}
          xs={12}
          md={6}
          lg={fields.length <= 2 ? 6 : 4}
          xl={fields.length <= 3 ? 4 : 3}
        >
          <FieldColumn
            field={field}
            selectedGameSlotId={selectedGameSlotId}
            onUpdateFieldName={onUpdateFieldName}
            onRemoveField={onRemoveField}
            onAddGameSlot={onAddGameSlot}
            onSelectGameSlot={onSelectGameSlot}
            onDeleteGameSlot={onDeleteGameSlot}
            onDuplicateGameSlot={onDuplicateGameSlot}
          />
        </Col>
      ))}
    </Row>
  );
};

export default DesignerCanvas;
