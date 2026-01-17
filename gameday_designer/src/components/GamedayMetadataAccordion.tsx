/**
 * GamedayMetadataAccordion Component
 *
 * Collapsible section for editing gameday-level metadata.
 */

import React from 'react';
import { Accordion, Form, Row, Col } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import type { GamedayMetadata } from '../types';

interface GamedayMetadataAccordionProps {
  metadata: GamedayMetadata;
  onUpdate: (data: Partial<GamedayMetadata>) => void;
  defaultActiveKey?: string;
}

const GamedayMetadataAccordion: React.FC<GamedayMetadataAccordionProps> = ({ 
  metadata, 
  onUpdate,
  defaultActiveKey
}) => {
  const { t } = useTypedTranslation(['ui']);

  const handleChange = (field: keyof GamedayMetadata, value: string) => {
    onUpdate({ [field]: value });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Accordion defaultActiveKey={defaultActiveKey} className="mb-3">
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          <div className="d-flex w-100 justify-content-between me-3 align-items-center">
            <span className="fw-bold">{metadata.name || t('ui:placeholder.gamedayName', 'New Gameday')}</span>
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
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group controlId="gamedayVenue">
                  <Form.Label>{t('ui:label.venue', 'Venue')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadata.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default GamedayMetadataAccordion;
