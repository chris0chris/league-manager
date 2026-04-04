import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';

interface SaveTemplateModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (name: string, description: string, sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL') => Promise<void>;
}

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ show, onHide, onSave }) => {
  const { t } = useTypedTranslation(['ui', 'modal']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharing, setSharing] = useState<'PRIVATE' | 'ASSOCIATION' | 'GLOBAL'>('ASSOCIATION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('ui:error.nameRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(name, description, sharing);
      onHide();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('ui:title.saveAsTemplate')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>{t('ui:label.templateName')} *</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('ui:placeholder.templateName')}
              autoFocus
              data-testid="template-name-input"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('ui:label.description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ui:placeholder.templateDescription')}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('ui:label.sharingLevel')}</Form.Label>
            <Form.Select
              value={sharing}
              onChange={(e) => setSharing(e.target.value as 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL')}
            >
              <option value="PRIVATE">{t('ui:sharing.private')}</option>
              <option value="ASSOCIATION">{t('ui:sharing.association')}</option>
              <option value="GLOBAL">{t('ui:sharing.global')}</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {sharing === 'PRIVATE' && t('ui:sharing.privateNote')}
              {sharing === 'ASSOCIATION' && t('ui:sharing.associationNote')}
              {sharing === 'GLOBAL' && t('ui:sharing.globalNote')}
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {t('ui:button.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading} data-testid="save-template-submit-button">
          {loading ? t('ui:button.saving') : t('ui:button.saveTemplate')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveTemplateModal;
