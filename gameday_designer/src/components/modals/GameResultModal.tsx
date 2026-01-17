import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import type { GameNode } from '../../types/flowchart';

export interface GameResultModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: { halftime_score: { home: number; away: number }; final_score: { home: number; away: number } }) => void;
  game: GameNode | null;
  homeTeamName: string;
  awayTeamName: string;
}

const GameResultModal: React.FC<GameResultModalProps> = ({
  show,
  onHide,
  onSave,
  game,
  homeTeamName,
  awayTeamName,
}) => {
  const { t } = useTypedTranslation(['ui']);
  const [halftimeHome, setHalftimeHome] = useState(0);
  const [halftimeAway, setHalftimeAway] = useState(0);
  const [finalHome, setFinalHome] = useState(0);
  const [finalAway, setFinalAway] = useState(0);

  useEffect(() => {
    if (game) {
      setHalftimeHome(game.data.halftime_score?.home || 0);
      setHalftimeAway(game.data.halftime_score?.away || 0);
      setFinalHome(game.data.final_score?.home || 0);
      setFinalAway(game.data.final_score?.away || 0);
    }
  }, [game]);

  const handleSave = () => {
    onSave({
      halftime_score: { home: halftimeHome, away: halftimeAway },
      final_score: { home: finalHome, away: finalAway },
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('ui:title.enterGameResult', 'Enter Game Result')}: {game?.data.standing}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <h6 className="text-uppercase text-muted small mb-3">{t('ui:label.halftimeScore', 'Halftime Score')}</h6>
          <Row className="mb-4 align-items-center">
            <Col>
              <Form.Group controlId="halftimeHome">
                <Form.Label className="small">{homeTeamName} (halftime)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={halftimeHome}
                  onChange={(e) => setHalftimeHome(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
            <Col xs="auto" className="pt-4">:</Col>
            <Col>
              <Form.Group controlId="halftimeAway">
                <Form.Label className="small">{awayTeamName} (halftime)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={halftimeAway}
                  onChange={(e) => setHalftimeAway(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
          </Row>

          <h6 className="text-uppercase text-muted small mb-3">{t('ui:label.finalScore', 'Final Score')}</h6>
          <Row className="mb-3 align-items-center">
            <Col>
              <Form.Group controlId="finalHome">
                <Form.Label className="small">{homeTeamName} (final)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={finalHome}
                  onChange={(e) => setFinalHome(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
            <Col xs="auto" className="pt-4">:</Col>
            <Col>
              <Form.Group controlId="finalAway">
                <Form.Label className="small">{awayTeamName} (final)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={finalAway}
                  onChange={(e) => setFinalAway(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>{t('ui:button.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={handleSave}>{t('ui:button.save', 'Save')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GameResultModal;
