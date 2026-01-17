/**
 * GamedayMetadataAccordion Component
 *
 * Collapsible section for editing gameday-level metadata.
 * Now includes gameday-level action buttons directly in the body.
 */

import React from 'react';
import { Accordion, Form, Row, Col, Button } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import type { GamedayMetadata } from '../types';
import { ICONS } from '../utils/iconConstants';

import './GamedayMetadataAccordion.css';

interface GamedayMetadataAccordionProps {
  metadata: GamedayMetadata;
  onUpdate: (data: Partial<GamedayMetadata>) => void;
  onPublish?: () => void;
  onUnlock?: () => void;
  onClearAll?: () => void;
  onDelete?: () => void;
  hasData?: boolean;
  defaultActiveKey?: string;
  readOnly?: boolean;
}

const GamedayMetadataAccordion: React.FC<GamedayMetadataAccordionProps> = ({ 
  metadata, 
  onUpdate,
  onPublish,
  onUnlock,
  onClearAll,
  onDelete,
  hasData = false,
  defaultActiveKey,
  readOnly = false
}) => {
  const { t } = useTypedTranslation(['ui', 'domain']);

  const handleChange = (field: keyof GamedayMetadata, value: string) => {
    if (readOnly) return;
    onUpdate({ [field]: value });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'warning';
      case 'PUBLISHED': return 'success';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'secondary';
      default: return 'light';
    }
  };

  const getStatusBadge = (status: string = 'DRAFT') => {
    return (
      <span className="badge bg-secondary border small">
        {t(`domain:status.${(status || 'DRAFT').toLowerCase()}`, status)}
      </span>
    );
  };

  const statusColor = getStatusColor(metadata.status);

  return (
    <div style={{ maxWidth: '800px' }} className="gameday-metadata-accordion">
      <Accordion defaultActiveKey={defaultActiveKey} className="mb-3">
        <Accordion.Item eventKey="0" className="border-0 shadow-sm">
          <Accordion.Header className={`header-status-${statusColor.toLowerCase()}`}>
            <div className="d-flex w-100 justify-content-between me-3 align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold">{metadata.name || t('ui:placeholder.gamedayName', 'New Gameday')}</span>
                {getStatusBadge(metadata.status)}
                {readOnly && metadata.status === 'DRAFT' && (
                  <span className="badge bg-light text-muted border small">
                    <i className="bi bi-lock-fill me-1"></i>
                    {t('ui:label.readOnly', 'Read-only')}
                  </span>
                )}
              </div>

              <span className="text-muted small">
                {formatDate(metadata.date)}
              </span>
            </div>
          </Accordion.Header>
          <Accordion.Body>
            <Form>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="gamedayName">
                    <Form.Label>{t('ui:label.name', 'Name')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={metadata.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      disabled={readOnly}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="gamedayDate">
                    <Form.Label>{t('ui:label.date', 'Date')}</Form.Label>
                    <Form.Control
                      type="date"
                      value={metadata.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      disabled={readOnly}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="gamedayStart">
                    <Form.Label>{t('ui:label.startTime', 'Start Time')}</Form.Label>
                    <Form.Control
                      type="time"
                      value={metadata.start}
                      onChange={(e) => handleChange('start', e.target.value)}
                      disabled={readOnly}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group controlId="gamedayVenue">
                    <Form.Label>{t('ui:label.venue', 'Venue')}</Form.Label>
                    <Form.Control
                      type="text"
                      value={metadata.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      disabled={readOnly}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <hr />

              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="d-flex gap-2">
                  {metadata.status === 'DRAFT' ? (
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={onPublish}
                      className="px-3"
                    >
                      <i className="bi bi-send-fill me-2"></i>
                      {t('ui:button.publishSchedule', 'Publish Schedule')}
                    </Button>
                  ) : (
                    <Button 
                      variant="warning" 
                      size="sm"
                      onClick={onUnlock}
                      className="px-3"
                    >
                      <i className="bi bi-unlock-fill me-2"></i>
                      {t('ui:button.unlockSchedule', 'Unlock Schedule')}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={onClearAll}
                    disabled={!hasData || metadata.status !== 'DRAFT'}
                    className="px-3"
                  >
                    <i className={`bi ${ICONS.CLEAR} me-2`}></i>
                    {t('ui:button.clearSchedule', 'Clear Schedule')}
                  </Button>
                </div>

                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={onDelete}
                  className="px-3"
                >
                  <i className={`bi ${ICONS.TRASH} me-2`}></i>
                  {t('ui:button.deleteGameday', 'Delete Gameday')}
                </Button>
              </div>
            </Form>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};

export default GamedayMetadataAccordion;