/**
 * TournamentGeneratorModal Component
 *
 * Modal dialog for generating complete tournaments from predefined templates.
 * Allows users to select format, field count, and start time.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Form, Card, Row, Col, Alert } from 'react-bootstrap';
import { TournamentTemplate, TournamentGenerationConfig } from '../../types/tournament';
import { getAllTemplates } from '../../utils/tournamentTemplates';
import { DEFAULT_START_TIME, DEFAULT_GAME_DURATION } from '../../utils/tournamentConstants';
import { GlobalTeam } from '../../types/flowchart';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';

export interface TournamentGeneratorModalProps {
  /** Whether the modal is visible */
  show: boolean;

  /** Callback when modal should be hidden */
  onHide: () => void;

  /** Global team pool */
  teams: GlobalTeam[];

  /** Callback when user confirms tournament generation */
  onGenerate: (config: TournamentGenerationConfig & { generateTeams: boolean; autoAssignTeams: boolean }) => void;
}

/**
 * TournamentGeneratorModal component
 *
 * Features:
 * - Template selection based on team count
 * - Field count configuration
 * - Start time input
 * - Preview of tournament structure
 */
const TournamentGeneratorModal: React.FC<TournamentGeneratorModalProps> = ({
  show,
  onHide,
  // teams - unused for now but kept in props for potential future use
  onGenerate,
}) => {
  const { t } = useTypedTranslation(['ui', 'modal', 'domain']);
  // Get all available templates
  const availableTemplates = useMemo(() => getAllTemplates(), []);

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(
    availableTemplates[0] || null
  );

  // Configuration state
  const [fieldCount, setFieldCount] = useState<number>(
    availableTemplates[0]?.fieldOptions[0] || 1
  );
  const [startTime, setStartTime] = useState<string>(DEFAULT_START_TIME);
  const [gameDuration, setGameDuration] = useState<number>(DEFAULT_GAME_DURATION);
  const [generateTeams, setGenerateTeams] = useState<boolean>(false);
    const [autoAssignTeams, setAutoAssignTeams] = useState<boolean>(true);
  
    /**
     * Reset form to default values
     */
    const resetForm = () => {
      setSelectedTemplate(availableTemplates[0] || null);
      setFieldCount(availableTemplates[0]?.fieldOptions[0] || 1);
      setStartTime(DEFAULT_START_TIME);
      setGameDuration(DEFAULT_GAME_DURATION);
      setGenerateTeams(false);
      setAutoAssignTeams(true);
    };
  
    // Reset form when modal is closed
    useEffect(() => {
      if (!show) {
        resetForm();
      }
      // We only want to reset when 'show' changes to false
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);
  
    // Validation
    const isDurationValid = gameDuration >= 15 && gameDuration <= 180;
  
      // Update field count when template changes
  
      useEffect(() => {
  
    
    if (selectedTemplate && selectedTemplate.fieldOptions.length > 0 && fieldCount === 1) {
      setFieldCount(selectedTemplate.fieldOptions[0]);
    }
  }, [selectedTemplate, fieldCount]);

  /**
   * Handle generate button click
   */
  const handleGenerate = () => {
    if (!selectedTemplate || !isDurationValid) return;

    onGenerate({
      template: {
        ...selectedTemplate,
        timing: {
          ...selectedTemplate.timing,
          defaultGameDuration: gameDuration,
        },
      },
      fieldCount,
      startTime,
      generateTeams,
      autoAssignTeams,
    });

    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-trophy me-2"></i>
          {t('modal:tournamentGenerator.title')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {availableTemplates.length === 0 ? (
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            {t('modal:tournamentGenerator.noTemplates')}
          </Alert>
        ) : (
          <>
            {/* Template selection cards */}
            <Form.Group className="mb-3">
              <Form.Label>
                <strong>{t('ui:label.tournamentFormat')}</strong>
              </Form.Label>
              {availableTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`mb-2 ${
                    selectedTemplate?.id === template.id ? 'border-primary' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <Card.Body className="p-3">
                    <Form.Check
                      type="radio"
                      id={`template-${template.id}`}
                      name="template"
                      label={
                        <>
                          <strong>{template.name}</strong>
                          <div className="text-muted small mt-1">
                            {t('modal:tournamentGenerator.previewStages', { count: template.stages.length })} |{' '}
                            {template.stages.map((s) => s.name).join(' → ')}
                          </div>
                        </>
                      }
                      checked={selectedTemplate?.id === template.id}
                      onChange={() => setSelectedTemplate(template)}
                    />
                  </Card.Body>
                </Card>
              ))}
            </Form.Group>

            {/* Configuration */}
            {selectedTemplate && (
              <>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="tournament-field-count">
                      <Form.Label>{t('ui:label.numberOfFields')}</Form.Label>
                      <Form.Select
                        value={fieldCount}
                        onChange={(e) => setFieldCount(parseInt(e.target.value))}
                      >
                        {selectedTemplate.fieldOptions.map((count) => (
                          <option key={count} value={count}>
                            {t('modal:tournamentGenerator.previewFields', { count })}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="tournament-start-time">
                      <Form.Label>{t('ui:label.startTime')}</Form.Label>
                      <Form.Control
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="tournament-game-duration">
                      <Form.Label>{t('ui:label.gameDuration')}</Form.Label>
                      <Form.Control
                        type="number"
                        min={15}
                        max={180}
                        value={gameDuration}
                        onChange={(e) => setGameDuration(parseInt(e.target.value) || 0)}
                        isInvalid={!isDurationValid}
                      />
                      <Form.Control.Feedback type="invalid">
                        Duration must be between 15 and 180 minutes.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Team Options */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="generate-teams"
                    label={t('modal:tournamentGenerator.generateTeams', {
                      count: selectedTemplate.teamCount.exact || selectedTemplate.teamCount.min
                    })}
                    checked={generateTeams}
                    onChange={(e) => setGenerateTeams(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="auto-assign-teams"
                    label={t('modal:tournamentGenerator.autoAssignTeams')}
                    checked={autoAssignTeams}
                    onChange={(e) => setAutoAssignTeams(e.target.checked)}
                    className="mt-2"
                  />
                </Form.Group>
              </>
            )}

            {/* Preview */}
            {selectedTemplate && (
              <Alert variant="light" className="mb-0">
                <strong>
                  <i className="bi bi-eye me-2"></i>
                  {t('modal:tournamentGenerator.previewTitle')}
                </strong>
                <ul className="mb-0 mt-2">
                  <li>
                    {t('modal:tournamentGenerator.previewFields', { count: fieldCount })}
                  </li>
                  <li>{t('modal:tournamentGenerator.previewStages', { count: selectedTemplate.stages.length })}</li>
                  <li>{t('modal:tournamentGenerator.previewFirstGame', { time: startTime })}</li>
                  <li>
                    {t('modal:tournamentGenerator.previewGameDuration', {
                      duration: gameDuration
                    })}
                  </li>
                </ul>
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('ui:button.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={!selectedTemplate}
        >
          <i className="bi bi-lightning-fill me-1"></i>
          {t('ui:button.generateTournament')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TournamentGeneratorModal;
