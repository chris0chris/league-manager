import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';

interface DeleteGamedayConfirmModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  gamedayName?: string;
}

const DeleteGamedayConfirmModal: React.FC<DeleteGamedayConfirmModalProps> = ({
  show,
  onHide,
  onConfirm,
  gamedayName,
}) => {
  const { t } = useTypedTranslation(['ui']);

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">
          <i className="bi bi-trash-fill me-2 text-danger"></i>
          {t('ui:button.deleteGameday')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="danger" className="mb-0">
          {t('ui:message.confirmDeleteGameday', { name: gamedayName ?? '' })}
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('ui:button.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t('ui:button.deleteGameday')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteGamedayConfirmModal;
