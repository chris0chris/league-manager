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
import { GlobalTeam } from '../../types/flowchart';

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
  teams,
  onGenerate,
}) => {
  // Get all available templates
  const availableTemplates = useMemo(() => getAllTemplates(), []);

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(
    availableTemplates[0] || null
  );

  // Configuration state
  const [fieldCount, setFieldCount] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [generateTeams, setGenerateTeams] = useState<boolean>(false);
  const [autoAssignTeams, setAutoAssignTeams] = useState<boolean>(true);

  // Update field count when template changes
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.fieldOptions.length > 0) {
      setFieldCount(selectedTemplate.fieldOptions[0]);
    }
  }, [selectedTemplate]);

  /**
   * Handle generate button click
   */
  const handleGenerate = () => {
    if (!selectedTemplate) return;

    onGenerate({
      template: selectedTemplate,
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
          Generate Tournament
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {availableTemplates.length === 0 ? (
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            No tournament templates available.
          </Alert>
        ) : (
          <>
            {/* Template selection cards */}
            <Form.Group className="mb-3">
              <Form.Label>
                <strong>Tournament Format</strong>
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
                            {template.stages.length} stages |{' '}
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Number of Fields</Form.Label>
                      <Form.Select
                        value={fieldCount}
                        onChange={(e) => setFieldCount(parseInt(e.target.value))}
                      >
                        {selectedTemplate.fieldOptions.map((count) => (
                          <option key={count} value={count}>
                            {count} Field{count !== 1 ? 's' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Team Options */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="generate-teams"
                    label={`Generate ${selectedTemplate.teamCount.exact || selectedTemplate.teamCount.min} teams automatically`}
                    checked={generateTeams}
                    onChange={(e) => setGenerateTeams(e.target.checked)}
                  />
                  <Form.Check
                    type="checkbox"
                    id="auto-assign-teams"
                    label="Auto-assign teams to games"
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
                  Preview:
                </strong>
                <ul className="mb-0 mt-2">
                  <li>
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  </li>
                  <li>{selectedTemplate.stages.length} stages</li>
                  <li>First game at {startTime}</li>
                  <li>
                    Default game duration: {selectedTemplate.timing.defaultGameDuration}{' '}
                    minutes
                  </li>
                </ul>
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={!selectedTemplate}
        >
          <i className="bi bi-lightning-fill me-1"></i>
          Generate Tournament
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TournamentGeneratorModal;
