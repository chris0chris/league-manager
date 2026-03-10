import React, { useState, useRef, useContext, useEffect } from 'react';
import { Accordion, Form, Row, Col, Button, Overlay, Popover, useAccordionButton, AccordionContext } from 'react-bootstrap';
import { GamedayMetadata, FlowValidationResult, ValidationError, ValidationWarning, HighlightedElement } from '../types/flowchart';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import { ICONS } from '../utils/iconConstants';
import { gamedayApi } from '../api/gamedayApi';
import './GamedayMetadataAccordion.css';

/**
 * Custom Accordion Header to prevent invalid HTML nesting (button inside button).
 * Uses useAccordionButton to trigger the toggle manually.
 */
const CustomAccordionHeader: React.FC<{
  eventKey: string;
  metadata: GamedayMetadata;
  statusColor: string;
  onPublish?: () => void;
  readOnly: boolean;
  validation: FlowValidationResult;
  t: (key: string, params?: unknown) => string;
  formatDate: (d: string) => string;
  getStatusBadge: (s?: string) => React.ReactNode;
  onHighlight: (id: string, type: HighlightedElement['type']) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  validationBadgeRef: React.RefObject<HTMLDivElement>;
  showValidationPopover: boolean;
  getHighlightType: (type: string) => HighlightedElement['type'];
  getMessage: (item: ValidationError | ValidationWarning) => string;
  isHighlighted: boolean;
}> = ({ 
  eventKey, metadata, statusColor, onPublish, readOnly, validation, t, formatDate, getStatusBadge, onHighlight,
  handleMouseEnter, handleMouseLeave, validationBadgeRef, showValidationPopover, getHighlightType, getMessage,
  isHighlighted
}) => {
  const { activeEventKey } = useContext(AccordionContext);
  const decoratedOnClick = useAccordionButton(eventKey);

  const isCurrentEventKey = activeEventKey === eventKey;

  return (
    <h2 
      className={`accordion-header header-status-${statusColor.toLowerCase()} position-relative ${isHighlighted ? 'header-highlighted' : ''}`}
      data-testid="gameday-metadata-header"
    >
      <button 
        type="button"
        className={`accordion-button d-flex w-100 justify-content-between align-items-center flex-wrap gap-2 ${isCurrentEventKey ? '' : 'collapsed'}`}
        onClick={decoratedOnClick}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold me-2">{metadata.name || t('ui:placeholder.gamedayName')}</span>
          {getStatusBadge(metadata.status)}
          
          {/* Validation Badges - Always Visible */}
          {validation && (
            <div 
              ref={validationBadgeRef}
              className="d-flex gap-1 ms-2" 
              data-testid="validation-badges"
              style={{ cursor: 'pointer' }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => e.stopPropagation()}
            >
              {validation.errors && validation.errors.length > 0 && (
                <span className="badge bg-danger">
                  <i className="bi bi-x-circle-fill me-1"></i>
                  {validation.errors.length}
                </span>
              )}
              {validation.warnings && validation.warnings.length > 0 && (
                <span className="badge bg-warning text-dark">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {validation.warnings.length}
                </span>
              )}
              {validation.isValid && (!validation.warnings || validation.warnings.length === 0) && (
                <span className="badge bg-success">
                  <i className="bi bi-check-circle-fill"></i>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-3 pe-5">
          <span className="text-muted small">
            {formatDate(metadata.date)}
          </span>
        </div>
      </button>

      {/* Integrated Publish button outside the toggle area but inside the header container */}
      {metadata.status === 'DRAFT' && !readOnly && (
        <div 
          className="publish-button-container"
          style={{ 
            position: 'absolute', 
            right: '60px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            zIndex: 10 
          }}
          onClick={(e) => e.stopPropagation()}
        >
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

      {/* Validation Popover */}
      {validation && (
        <Overlay
          show={showValidationPopover && ((validation.errors?.length || 0) > 0 || (validation.warnings?.length || 0) > 0)}
          target={validationBadgeRef}
          placement="bottom"
          offset={[0, 10]}
        >
          {(props) => (
            <Popover 
              id="validation-popover" 
              {...props} 
              className="shadow border-danger" 
              style={{ ...props.style, maxWidth: '400px', zIndex: 1060 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Popover.Header as="h3" className="bg-danger text-white py-2 small">
                {t('ui:label.validation', 'Validation')}
              </Popover.Header>
              <Popover.Body className="p-0">
                <div className="list-group list-group-flush small overflow-auto" style={{ maxHeight: '300px' }}>
                  {validation.errors?.map((error, idx) => (
                    <div 
                      key={`error-${idx}`} 
                      className="list-group-item list-group-item-action list-group-item-danger border-0 d-flex align-items-start py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlight(error.affectedNodes[0], getHighlightType(error));
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className={`bi ${ICONS.ERROR} me-2 mt-1`}></i>
                      <div>{getMessage(error)}</div>
                    </div>
                  ))}
                  {validation.warnings?.map((warning, idx) => (
                    <div 
                      key={`warning-${idx}`} 
                      className="list-group-item list-group-item-action list-group-item-warning border-0 d-flex align-items-start py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlight(warning.affectedNodes[0], getHighlightType(warning));
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className={`bi ${ICONS.WARNING} me-2 mt-1`}></i>
                      <div>{getMessage(warning)}</div>
                    </div>
                  ))}
                </div>
              </Popover.Body>
            </Popover>
          )}
        </Overlay>
      )}
    </h2>
  );
};

interface GamedayMetadataAccordionProps {
  metadata: GamedayMetadata;
  onUpdate: (data: Partial<GamedayMetadata>) => void;
  onClearAll: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnlock: () => void;
  onHighlight: (id: string, type: HighlightedElement['type']) => void;
  validation: FlowValidationResult;
  highlightedElement?: HighlightedElement | null;
  readOnly: boolean;
  hasData: boolean;
}

const GamedayMetadataAccordion: React.FC<GamedayMetadataAccordionProps> = ({
  metadata,
  onUpdate,
  onClearAll,
  onDelete,
  onPublish,
  onUnlock,
  onHighlight,
  validation,
  highlightedElement,
  readOnly,
  hasData,
}) => {
  const { t } = useTypedTranslation(['ui', 'domain', 'validation']);
  const [seasons, setSeasons] = useState<{ id: number; name: string }[]>([]);
  const [leagues, setLeagues] = useState<{ id: number; name: string }[]>([]);

  console.log('[MetadataAccordion] metadata:', metadata.name, metadata.date);

  React.useEffect(() => {
    const fetchMetadata = async () => {
      // Safety check for tests where gamedayApi might be mocked as undefined
      if (!gamedayApi) return;
      
      try {
        const [s, l] = await Promise.all([
          gamedayApi.listSeasons(),
          gamedayApi.listLeagues(),
        ]);
        setSeasons(s);
        setLeagues(l);
      } catch (error) {
        console.error('Failed to fetch metadata options', error);
      }
    };
    fetchMetadata();
  }, []);

  const [showValidationPopover, setShowValidationPopover] = useState(false);
  const validationBadgeRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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

  const handleChange = (field: keyof GamedayMetadata, value: string | number) => {
    if (readOnly) return;
    console.log('[MetadataAccordion] handleChange:', field, value);
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

  const getHighlightType = (item: ValidationError | ValidationWarning): HighlightedElement['type'] => {
    const node0 = item.affectedNodes[0] || '';
    if (node0 === 'metadata' || node0.startsWith('metadata-')) return 'metadata' as HighlightedElement['type'];
    if (node0 === 'team-pool') return 'team';
    if (node0 === 'fields-card') return 'field';
    
    const errorType = item.type;
    if (errorType === 'field_overlap' || errorType === 'team_overlap' || errorType === 'no_games' || errorType === 'broken_progression' || errorType === 'uneven_game_distribution') return 'game';
    if (errorType.includes('stage')) return 'stage';
    if (errorType.includes('field')) return 'field';
    if (errorType.includes('team')) return 'team';
    return 'game';
  };

  const isHighlighted = highlightedElement?.type === 'metadata';

  const isFieldHighlighted = (fieldName: string) => {
    // fieldName is 'name', 'date', 'start', etc.
    // controlId is 'gamedayName', 'gamedayDate', etc.
    const capitalizedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const controlId = `gameday${capitalizedFieldName}`;
    return highlightedElement?.id === `metadata-${controlId}`;
  };

  return (
    <div className={`gameday-metadata-accordion-container ${isHighlighted ? 'is-highlighted' : ''}`} id="gameday-metadata" data-testid="gameday-metadata-accordion">
      <Accordion.Item eventKey="0">
        <CustomAccordionHeader 
          eventKey="0" 
          metadata={metadata} 
          statusColor={getStatusColor(metadata.status)} 
          onPublish={onPublish}
          readOnly={readOnly}
          validation={validation}
          t={t}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          onHighlight={onHighlight}
          handleMouseEnter={handleMouseEnter}
          handleMouseLeave={handleMouseLeave}
          validationBadgeRef={validationBadgeRef}
          showValidationPopover={showValidationPopover}
          getHighlightType={getHighlightType}
          getMessage={getMessage}
          isHighlighted={isHighlighted}
        />
        <Accordion.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="gamedayName">
                  <Form.Label>{t('ui:label.gamedayName', 'Gameday Name')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadata.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={readOnly}
                    className={isFieldHighlighted('name') ? 'is-highlighted' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="gamedayDate">
                  <Form.Label>{t('ui:label.gamedayDate', 'Gameday Date')}</Form.Label>
                  <Form.Control
                    type="date"
                    value={metadata.date || ''}
                    onChange={(e) => handleChange('date', e.target.value)}
                    disabled={readOnly}
                    className={isFieldHighlighted('date') ? 'is-highlighted' : ''}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="gamedayStart">
                  <Form.Label>{t('ui:label.gamedayStartTime', 'Start Time')}</Form.Label>
                  <Form.Control
                    type="time"
                    value={metadata.start}
                    onChange={(e) => handleChange('start', e.target.value)}
                    disabled={readOnly}
                    className={isFieldHighlighted('start') ? 'is-highlighted' : ''}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="gamedayVenue">
                  <Form.Label>{t('ui:label.venue', 'Venue')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadata.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    disabled={readOnly}
                    placeholder={t('ui:label.venue')}
                    className={isFieldHighlighted('venue') ? 'is-highlighted' : ''}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group controlId="gamedaySeason">
                  <Form.Label>{t('ui:label.season', 'Season')}</Form.Label>
                  <Form.Select
                    value={metadata.season}
                    onChange={(e) => handleChange('season', parseInt(e.target.value, 10))}
                    disabled={readOnly}
                    className={isFieldHighlighted('season') ? 'is-highlighted' : ''}
                  >
                    <option value="0">--- {t('ui:placeholder.selectSeason')} ---</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="gamedayLeague">
                  <Form.Label>{t('ui:label.league', 'League')}</Form.Label>
                  <Form.Select
                    value={metadata.league}
                    onChange={(e) => handleChange('league', parseInt(e.target.value, 10))}
                    disabled={readOnly}
                    className={isFieldHighlighted('league') ? 'is-highlighted' : ''}
                  >
                    <option value="0">--- {t('ui:placeholder.selectLeague')} ---</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr />

            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex gap-2">
                {metadata.status !== 'DRAFT' && (
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={onUnlock}
                    className="px-3"
                  >
                    <i className={`bi ${ICONS.UNLOCK} me-2`}></i>
                    {t('ui:button.unlockSchedule')}
                  </Button>
                )}
                
                <Button 
                  variant="outline-secondary" 
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
                disabled={metadata.status !== 'DRAFT'}
                className="px-3"
              >
                <i className={`bi ${ICONS.TRASH} me-2`}></i>
                {t('ui:button.deleteGameday')}
              </Button>
            </div>
          </Form>
        </Accordion.Body>
      </Accordion.Item>
    </div>
  );
};

export default GamedayMetadataAccordion;