/**
 * ValidationPanel Component
 *
 * Displays validation errors and warnings for the schedule.
 * Allows clicking on issues to navigate to affected game slots.
 */

import React from 'react';
import { Card, Alert, ListGroup, Badge } from 'react-bootstrap';
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/designer';
import { useTypedTranslation } from '../i18n/useTypedTranslation';

export interface ValidationPanelProps {
  /** Validation result to display */
  result: ValidationResult;
  /** Callback when clicking on an issue to navigate to a slot */
  onNavigateToSlot: (slotId: string) => void;
}

/**
 * ValidationPanel component.
 */
const ValidationPanel: React.FC<ValidationPanelProps> = ({
  result,
  onNavigateToSlot,
}) => {
  const { t } = useTypedTranslation(['ui', 'validation']);
  const { isValid, errors, warnings } = result;

  /**
   * Helper to translate error/warning message.
   */
  const getMessage = (item: ValidationError | ValidationWarning) => {
    if (item.messageKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return t(`validation:${item.messageKey}` as any, item.messageParams);
    }
    return item.message;
  };

  /**
   * Handle clicking on an error/warning to navigate.
   */
  const handleItemClick = (affectedSlots: string[]) => {
    if (affectedSlots.length > 0) {
      onNavigateToSlot(affectedSlots[0]);
    }
  };

  /**
   * Render an error item.
   */
  const renderError = (error: ValidationError) => (
    <ListGroup.Item
      key={error.id}
      action
      variant="danger"
      onClick={() => handleItemClick(error.affectedSlots)}
      className="d-flex justify-content-between align-items-center"
    >
      <span>{getMessage(error)}</span>
      <Badge bg="danger" pill>
        {error.affectedSlots.length}
      </Badge>
    </ListGroup.Item>
  );

  /**
   * Render a warning item.
   */
  const renderWarning = (warning: ValidationWarning) => (
    <ListGroup.Item
      key={warning.id}
      action
      variant="warning"
      onClick={() => handleItemClick(warning.affectedSlots)}
      className="d-flex justify-content-between align-items-center"
    >
      <span>{getMessage(warning)}</span>
      <Badge bg="warning" text="dark" pill>
        {warning.affectedSlots.length}
      </Badge>
    </ListGroup.Item>
  );

  // Build summary text
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const errorText = t('validation:errorCount', { count: errorCount });
  const warningText = t('validation:warningCount', { count: warningCount });

  return (
    <Card className="validation-panel">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>{t('ui:label.validation')}</span>
        <span>
          {errorCount > 0 && (
            <Badge bg="danger" className="me-2">
              {errorText}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge bg="warning" text="dark">
              {warningText}
            </Badge>
          )}
        </span>
      </Card.Header>
      <Card.Body className="p-0">
        {isValid && errors.length === 0 && warnings.length === 0 ? (
          <Alert variant="success" className="m-3 mb-0">
            <i className="bi bi-check-circle me-2"></i>
            {t('validation:scheduleValid')}
          </Alert>
        ) : (
          <ListGroup variant="flush">
            {errors.map(renderError)}
            {warnings.map(renderWarning)}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default ValidationPanel;
