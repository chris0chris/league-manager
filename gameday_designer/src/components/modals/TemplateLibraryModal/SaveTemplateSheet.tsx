import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface SaveTemplateSheetProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: { name: string; description: string; sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL' }) => void;
}

const SCOPE_OPTIONS = [
  { value: 'PRIVATE' as const, icon: '🔒', label: 'Personal', desc: 'Only visible to you' },
  { value: 'ASSOCIATION' as const, icon: '🏛️', label: 'Association', desc: 'Shared with your association' },
  { value: 'GLOBAL' as const, icon: '🌐', label: 'Global', desc: 'Visible to all users' },
];

const SaveTemplateSheet: React.FC<SaveTemplateSheetProps> = ({ show, onHide, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharing, setSharing] = useState<'PRIVATE' | 'ASSOCIATION' | 'GLOBAL'>('PRIVATE');
  const [validated, setValidated] = useState(false);

  const handleSave = () => {
    setValidated(true);
    if (!name.trim()) return;
    onSave({ name: name.trim(), description, sharing });
    setName(''); setDescription(''); setSharing('PRIVATE'); setValidated(false);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>💾 Save as Template</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form noValidate>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small text-uppercase">Template name *</Form.Label>
            <Form.Control
              placeholder="Template name..."
              value={name}
              onChange={e => setName(e.target.value)}
              isInvalid={validated && !name.trim()}
            />
            <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small text-uppercase">Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Describe when to use this template..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label className="fw-semibold small text-uppercase">Visibility *</Form.Label>
            <div className="d-flex gap-2">
              {SCOPE_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`flex-fill border rounded p-2 text-center ${sharing === opt.value ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  data-testid={`sharing-option-${opt.value.toLowerCase()}`}
                  onClick={() => setSharing(opt.value)}
                >
                  <div style={{ fontSize: 22 }}>{opt.icon}</div>
                  <div className="fw-semibold small">{opt.label}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>Cancel</Button>
        <Button variant="success" onClick={handleSave}>Save Template</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveTemplateSheet;
