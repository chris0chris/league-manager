import React, { useState } from 'react';
import { Button, Badge, Form, Row, Col } from 'react-bootstrap';
import { ScheduleTemplate } from '../../../types/api';
import { SelectedTemplate } from './TemplateList';
import { TournamentTemplate } from '../../../utils/tournamentTemplates';

export interface TournamentConfig {
  startTime: string;
  gameDuration: number;
  breakDuration: number;
  numFields: number;
}

interface TemplatePreviewProps {
  selected: SelectedTemplate | null;
  currentUserId: number;
  onApply: (selected: SelectedTemplate, config?: TournamentConfig) => void;
  onClone: (selected: SelectedTemplate) => void;
  onDelete: (template: ScheduleTemplate) => void;
  onSave: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  selected, currentUserId, onApply, onClone, onDelete,
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [gameDuration, setGameDuration] = useState(() => {
    if (!selected) return 15;
    if (selected.type === 'builtin') return (selected.template as TournamentTemplate).timing?.defaultGameDuration ?? 15;
    return (selected.template as ScheduleTemplate).game_duration;
  });
  const [breakDuration, setBreakDuration] = useState(() => {
    if (!selected || selected.type !== 'builtin') return 0;
    return (selected.template as TournamentTemplate).timing?.defaultBreakBetweenGames ?? 5;
  });
  const [numFields, setNumFields] = useState(() => {
    if (!selected) return 2;
    if (selected.type === 'builtin') return (selected.template as TournamentTemplate).fieldOptions?.[0] ?? 2;
    return (selected.template as ScheduleTemplate).num_fields;
  });

  if (!selected) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        Select a template to preview
      </div>
    );
  }

  const isBuiltin = selected.type === 'builtin';
  const name = isBuiltin
    ? (selected.template as TournamentTemplate).name
    : (selected.template as ScheduleTemplate).name;
  const savedTemplate = isBuiltin ? null : (selected.template as ScheduleTemplate);
  const canDelete = savedTemplate && savedTemplate.created_by === currentUserId;

  const sharingBadge = isBuiltin
    ? <Badge bg="secondary">Built-in</Badge>
    : savedTemplate?.sharing === 'PRIVATE'
      ? <Badge bg="primary">Personal</Badge>
      : savedTemplate?.sharing === 'ASSOCIATION'
        ? <Badge bg="success">Association</Badge>
        : <Badge style={{ background: '#6f42c1' }}>Community</Badge>;

  return (
    <div className="d-flex flex-column h-100">
      <div className="p-3 border-bottom">
        <h5 className="mb-1">{name}</h5>
        <div className="d-flex gap-2 flex-wrap">
          {sharingBadge}
          {savedTemplate && (
            <>
              <Badge bg="light" text="dark">{savedTemplate.num_teams} teams</Badge>
              <Badge bg="light" text="dark">{savedTemplate.num_fields} fields</Badge>
              <Badge bg="light" text="dark">{savedTemplate.game_duration} min/game</Badge>
            </>
          )}
          {isBuiltin && (
            <Badge bg="light" text="dark">{(selected.template as TournamentTemplate).teamCount.min} teams</Badge>
          )}
        </div>
      </div>

      <div className="flex-grow-1 p-3 overflow-auto">
        {savedTemplate?.description && (
          <p className="text-muted small mb-3">{savedTemplate.description}</p>
        )}

        <div className="bg-warning-subtle border border-warning rounded p-3 mb-3">
          <h6 className="text-warning-emphasis mb-3">⚙️ Configure before applying</h6>
          <Row className="g-2">
            <Col xs={12} sm={3}>
              <Form.Label className="small fw-semibold">Start time</Form.Label>
              <Form.Control type="time" size="sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </Col>
            <Col xs={12} sm={3}>
              <Form.Label className="small fw-semibold">Game duration (min)</Form.Label>
              <Form.Control type="number" size="sm" min={5} max={90} value={gameDuration} onChange={e => setGameDuration(+e.target.value)} />
            </Col>
            <Col xs={12} sm={3}>
              <Form.Label className="small fw-semibold">Break after (min)</Form.Label>
              <Form.Control type="number" size="sm" min={0} max={30} value={breakDuration} onChange={e => setBreakDuration(+e.target.value)} />
            </Col>
            {!isBuiltin && (
              <Col xs={12} sm={3}>
                <Form.Label htmlFor="num-fields-input" className="small fw-semibold">Number of fields</Form.Label>
                <Form.Control id="num-fields-input" type="number" size="sm" min={1} max={10} value={numFields} onChange={e => setNumFields(+e.target.value)} />
              </Col>
            )}
          </Row>
        </div>
      </div>

      <div className="p-3 border-top bg-light d-flex gap-2">
        <Button
          variant="primary"
          data-testid="apply-template-button"
          onClick={() => onApply(selected, { startTime, gameDuration, breakDuration, numFields })}
        >
          Apply to Gameday →
        </Button>
        <Button variant="outline-secondary" onClick={() => onClone(selected)}>
          Clone &amp; Edit
        </Button>
        <div className="ms-auto">
          {canDelete && (
            <Button variant="outline-danger" onClick={() => onDelete(savedTemplate)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
