/**
 * GameSlotEditor Component
 *
 * Modal for editing game slot details:
 * - Stage (Vorrunde, Finalrunde, custom)
 * - Standing (match identifier)
 * - Home, Away, Official team references
 * - Break time after game
 * - Save and Cancel buttons
 */

import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import type { GameSlot, TeamReference } from '../types/designer';
import TeamSelector from './TeamSelector';

export interface GameSlotEditorProps {
  /** Whether to show the modal */
  show: boolean;
  /** The game slot to edit (null if none selected) */
  gameSlot: GameSlot | null;
  /** Callback when save is clicked */
  onSave: (gameSlot: GameSlot) => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
  /** Available match names for team selectors */
  matchNames: string[];
  /** Available group names for team selectors */
  groupNames: string[];
}

/**
 * Inner form component that remounts when gameSlot changes.
 * This avoids the need for useEffect to sync state.
 */
interface EditorFormProps {
  gameSlot: GameSlot;
  onSave: (gameSlot: GameSlot) => void;
  onCancel: () => void;
  matchNames: string[];
  groupNames: string[];
}

const EditorForm: React.FC<EditorFormProps> = ({
  gameSlot,
  onSave,
  onCancel,
  matchNames,
  groupNames,
}) => {
  // Local state initialized from gameSlot
  const [stage, setStage] = useState(gameSlot.stage);
  const [standing, setStanding] = useState(gameSlot.standing);
  const [home, setHome] = useState<TeamReference>(gameSlot.home);
  const [away, setAway] = useState<TeamReference>(gameSlot.away);
  const [official, setOfficial] = useState<TeamReference>(gameSlot.official);
  const [breakAfter, setBreakAfter] = useState(gameSlot.breakAfter);

  /**
   * Handle save button click.
   */
  const handleSave = () => {
    const updatedSlot: GameSlot = {
      id: gameSlot.id,
      stage,
      standing,
      home,
      away,
      official,
      breakAfter,
    };

    onSave(updatedSlot);
  };

  /**
   * Handle stage change.
   */
  const handleStageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStage(event.target.value);
  };

  /**
   * Handle standing change.
   */
  const handleStandingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStanding(event.target.value);
  };

  /**
   * Handle break time change.
   */
  const handleBreakChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBreakAfter(parseInt(event.target.value, 10) || 0);
  };

  return (
    <>
      <Modal.Body>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="stage">
              <Form.Label>Stage</Form.Label>
              <Form.Select value={stage} onChange={handleStageChange}>
                <option value="Vorrunde">Vorrunde</option>
                <option value="Finalrunde">Finalrunde</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="standing">
              <Form.Label>Standing</Form.Label>
              <Form.Control
                type="text"
                value={standing}
                onChange={handleStandingChange}
                placeholder="e.g., Gruppe 1, HF1, P1"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={4}>
            <TeamSelector
              value={home}
              onChange={setHome}
              label="Home"
              matchNames={matchNames}
              groupNames={groupNames}
            />
          </Col>
          <Col md={4}>
            <TeamSelector
              value={away}
              onChange={setAway}
              label="Away"
              matchNames={matchNames}
              groupNames={groupNames}
            />
          </Col>
          <Col md={4}>
            <TeamSelector
              value={official}
              onChange={setOfficial}
              label="Official"
              matchNames={matchNames}
              groupNames={groupNames}
            />
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <Form.Group controlId="breakAfter">
              <Form.Label>Break After (minutes)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={breakAfter}
                onChange={handleBreakChange}
              />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </>
  );
};

/**
 * GameSlotEditor component.
 * A modal form for editing game slot details.
 */
const GameSlotEditor: React.FC<GameSlotEditorProps> = ({
  show,
  gameSlot,
  onSave,
  onCancel,
  matchNames,
  groupNames,
}) => {
  if (!show || !gameSlot) {
    return null;
  }

  return (
    <Modal show={show} onHide={onCancel} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Game</Modal.Title>
      </Modal.Header>
      {/* Key forces remount when gameSlot.id changes */}
      <EditorForm
        key={gameSlot.id}
        gameSlot={gameSlot}
        onSave={onSave}
        onCancel={onCancel}
        matchNames={matchNames}
        groupNames={groupNames}
      />
    </Modal>
  );
};

export default GameSlotEditor;
