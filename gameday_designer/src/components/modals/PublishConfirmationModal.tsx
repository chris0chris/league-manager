/**
 * PublishConfirmationModal Component
 * 
 * Final confirmation step before locking a schedule.
 * Shows validation errors (blocking) and warnings (confirmation required).
 */

import React from 'react';
import { Modal, Button, Alert, ListGroup } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import type { FlowValidationResult, FlowValidationError, FlowValidationWarning, HighlightedElement } from '../../types/flowchart';

interface PublishConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  validation: FlowValidationResult;
  onHighlight?: (id: string, type: HighlightedElement['type']) => void;
}

const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  show,
  onHide,
  onConfirm,
  validation,
  onHighlight
}) => {
  const { t } = useTypedTranslation(['ui', 'validation', 'modal']);
  const { isValid, errors, warnings } = validation;

  const getMessage = (item: FlowValidationError | FlowValidationWarning) => {
    if (item.messageKey) {
      return t(`validation:${item.messageKey}` as const, item.messageParams);
    }
    return item.message;
  };

  const getHighlightType = (errorType: string): HighlightedElement['type'] => {
    if (errorType === 'field_overlap' || errorType === 'team_overlap') return 'game';
    if (errorType.includes('stage')) return 'stage';
    if (errorType.includes('field')) return 'field';
    if (errorType.includes('team')) return 'team';
    return 'game';
  };

  const handleItemClick = (item: FlowValidationError | FlowValidationWarning) => {
    const nodeId = item.affectedNodes?.[0];
    if (nodeId && onHighlight) {
      onHighlight(nodeId, getHighlightType(item.type));
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-send-fill me-2"></i>
          {t('modal:publishConfirmation.title', 'Publish Schedule')}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="mb-4">
          {t('modal:publishConfirmation.description', 'Publishing the schedule will lock its structure. Results can be entered, but games and teams cannot be added or removed.')}
        </p>

        {!isValid && (
          <Alert variant="danger" className="mb-4">
            <Alert.Heading className="h6">
              <i className="bi bi-x-circle-fill me-2"></i>
              {t('modal:publishConfirmation.errorsTitle', 'Blocking Errors Found')}
            </Alert.Heading>
            <p className="small mb-2">
              {t('modal:publishConfirmation.errorsDescription', 'The following issues must be resolved before the schedule can be published:')}
            </p>
            <ListGroup variant="flush" className="bg-transparent">
              {errors.map(err => (
                <ListGroup.Item 
                  key={err.id} 
                  className="bg-transparent border-0 py-1 ps-0 small text-danger"
                  action
                  onClick={() => handleItemClick(err)}
                >
                  <i className="bi bi-dot me-1"></i>
                  {getMessage(err)}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert variant="warning" className="mb-0">
            <Alert.Heading className="h6">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {t('modal:publishConfirmation.warningsTitle', 'Warnings Found')}
            </Alert.Heading>
            <p className="small mb-2">
              {t('modal:publishConfirmation.warningsDescription', 'The schedule has some potential issues. You can still publish, but please review these items:')}
            </p>
            <ListGroup variant="flush" className="bg-transparent">
              {warnings.map(warn => (
                <ListGroup.Item 
                  key={warn.id} 
                  className="bg-transparent border-0 py-1 ps-0 small text-warning-emphasis"
                  action
                  onClick={() => handleItemClick(warn)}
                >
                  <i className="bi bi-dot me-1"></i>
                  {getMessage(warn)}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Alert>
        )}

        {isValid && warnings.length === 0 && (
          <Alert variant="success" className="mb-0 border-0">
            <i className="bi bi-check-circle-fill me-2"></i>
            {t('modal:publishConfirmation.ready', 'The schedule is valid and ready to be published.')}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide}>
          {t('ui:button.cancel', 'Cancel')}
        </Button>
        <Button 
          variant={isValid ? "success" : "outline-danger"} 
          onClick={onConfirm}
          disabled={!isValid}
        >
          {warnings.length > 0 
            ? t('modal:publishConfirmation.confirmWithWarnings', 'Publish Anyway') 
            : t('modal:publishConfirmation.confirm', 'Publish Now')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PublishConfirmationModal;
