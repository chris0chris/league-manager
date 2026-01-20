/**
 * GamedayMetadataAccordion Component
 *
 * Collapsible section for editing gameday-level metadata.
 * Now includes gameday-level action buttons directly in the body.
 */

import React, { useState, useRef } from 'react';
import { Accordion, Form, Row, Col, Button, Overlay, Popover, ListGroup } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import type { GamedayMetadata, FlowValidationError as ValidationError, FlowValidationWarning as ValidationWarning, HighlightedElement } from '../types/flowchart';
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
  activeKey?: string | null;
  onSelect?: (key: string | null) => void;
  readOnly?: boolean;
  validation?: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
  onHighlight?: (id: string, type: HighlightedElement['type']) => void;
}

const GamedayMetadataAccordion: React.FC<GamedayMetadataAccordionProps> = ({
  metadata,
  onUpdate,
  onPublish,
  onUnlock,
  onClearAll,
  onDelete,
  hasData = false,
  activeKey,
  onSelect,
  readOnly = false,
  validation,
  onHighlight
}) => {
  const { t } = useTypedTranslation(['ui', 'domain', 'validation']);

  const [showValidationPopover, setShowValidationPopover] = useState(false);
  const validationBadgeRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowValidationPopover(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowValidationPopover(false);
    }, 300);
  };

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

  const getMessage = (item: ValidationError | ValidationWarning) => {
    if (item.messageKey) {
      return t(`validation:${item.messageKey}` as const, item.messageParams);
    }
    return item.message;
  };

  const getHighlightType = (errorType: string): HighlightedElement['type'] => {
    if (errorType === 'field_overlap' || errorType === 'team_overlap' || errorType === 'no_games' || errorType === 'broken_progression') return 'game';
    if (errorType.includes('stage')) return 'stage';
    if (errorType.includes('field')) return 'field';
    if (errorType.includes('team')) return 'team';
    return 'game';
  };

  const statusColor = getStatusColor(metadata.status);

  return (
    <div style={{ maxWidth: '1000px', width: '100%', position: 'relative' }} className="gameday-metadata-accordion mx-auto">
      {/* Absolute positioned publish button to avoid nesting in accordion header button */}
      {metadata.status === 'DRAFT' && !readOnly && (
        <div style={{ position: 'absolute', right: '100px', top: '12px', zIndex: 10 }}>
          <Button 
            variant="success" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPublish?.();
            }}
            className="rounded-pill py-0 px-3 border-0 shadow-sm fw-bold d-flex align-items-center"
            style={{ fontSize: '0.7rem', height: '22px' }}
            data-testid="publish-schedule-button"
          >
            <i className="bi bi-send-fill me-1"></i>
            {t('ui:button.publishSchedule')}
          </Button>
        </div>
      )}

      <Accordion 
        activeKey={activeKey} 
        onSelect={(key) => onSelect?.(key as string | null)}
        className="mb-3"
      >
        <Accordion.Item eventKey="0" className="border-0 shadow-sm">
          <Accordion.Header 
            className={`header-status-${statusColor.toLowerCase()}`}
            data-testid="gameday-metadata-header"
          >
            <div className="d-flex w-100 justify-content-between me-3 align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold me-2">{metadata.name || t('ui:placeholder.gamedayName')}</span>
                {getStatusBadge(metadata.status)}
                
                {/* Validation Badges - Always Visible */}
                {validation && (
                  <>
                    <div 
                      ref={validationBadgeRef}
                      className="d-flex gap-1 ms-2" 
                      data-testid="validation-badges"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {validation.errors.length > 0 && (
                        <span className="badge bg-danger">
                          <i className="bi bi-x-circle-fill me-1"></i>
                          {validation.errors.length}
                        </span>
                      )}
                      {validation.warnings.length > 0 && (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-exclamation-triangle-fill me-1"></i>
                          {validation.warnings.length}
                        </span>
                      )}
                      {validation.isValid && validation.warnings.length === 0 && (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle-fill"></i>
                        </span>
                      )}
                    </div>

                    <Overlay
                      show={showValidationPopover && (validation.errors.length > 0 || validation.warnings.length > 0)}
                      target={validationBadgeRef}
                      placement="bottom"
                    >
                      {(props) => (
                        <Popover 
                          {...props} 
                          id="validation-popover" 
                          style={{ ...props.style, pointerEvents: 'auto', zIndex: 1060, maxWidth: '400px' }}
                          onMouseEnter={handleMouseEnter}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Popover.Header as="h3" className="d-flex justify-content-between align-items-center py-2">
                            <span className="small fw-bold">{t('ui:label.validation', 'Validation')}</span>
                          </Popover.Header>
                          <Popover.Body className="p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <ListGroup variant="flush">
                              {/* Errors Section */}
                              {validation.errors.map((error, idx) => (
                                <ListGroup.Item 
                                  key={`err-${idx}`} 
                                  action 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onHighlight?.(error.affectedNodes?.[0], getHighlightType(error.type));
                                  }}
                                  className="d-flex align-items-start border-0 py-2"
                                >
                                  <i className="bi bi-exclamation-circle-fill text-danger me-2 mt-1"></i>
                                  <div className="small">{getMessage(error)}</div>
                                </ListGroup.Item>
                              ))}
                              
                              {/* Warnings Section */}
                              {validation.warnings.map((warning, idx) => (
                                <ListGroup.Item 
                                  key={`warn-${idx}`} 
                                  action 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onHighlight?.(warning.affectedNodes?.[0], getHighlightType(warning.type));
                                  }}
                                  className="d-flex align-items-start border-0 py-2"
                                >
                                  <i className="bi bi-exclamation-triangle-fill text-warning me-2 mt-1"></i>
                                  <div className="small">{getMessage(warning)}</div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </Popover.Body>
                        </Popover>
                      )}
                    </Overlay>
                  </>
                )}
              </div>

              <div className="d-flex align-items-center gap-3">
                {/* Spacer for absolute positioned button */}
                {metadata.status === 'DRAFT' && !readOnly && <div style={{ width: '130px' }} />}

                <span className="text-muted small">
                  {formatDate(metadata.date)}
                </span>
              </div>
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
                  {metadata.status !== 'DRAFT' && (
                    <Button 
                      variant="warning" 
                      size="sm"
                      onClick={onUnlock}
                      className="px-3"
                    >
                      <i className="bi bi-unlock-fill me-2"></i>
                      {t('ui:button.unlockSchedule')}
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
                    {t('ui:button.clearSchedule')}
                  </Button>
                </div>

                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={onDelete}
                  className="px-3"
                >
                  <i className={`bi ${ICONS.TRASH} me-2`}></i>
                  {t('ui:button.deleteGameday')}
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