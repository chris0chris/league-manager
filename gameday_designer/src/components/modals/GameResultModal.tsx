import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { GameNode } from '../../types/designer';
import { useTypedTranslation } from '../../i18n/i18n';

interface GameResultModalProps {
  show: boolean;
  onHide: () => void;
  game: GameNode | null;
  onSave: (halftime: { home: number; away: number }, final: { home: number; away: number }) => Promise<void>;
}

const GameResultModal: React.FC<GameResultModalProps> = ({ show, onHide, game, onSave }) => {
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

  const handleSave = useCallback(async () => {
    await onSave(
      { home: halftimeHome, away: halftimeAway },
      { home: finalHome, away: finalAway }
    );
  }, [onSave, halftimeHome, halftimeAway, finalHome, finalAway]);

  const homeTeamName = game?.data.resolvedHomeTeam || game?.data.home.name || t('ui:label.homeTeam', { team: '' });
  const awayTeamName = game?.data.resolvedAwayTeam || game?.data.away.name || t('ui:label.awayTeam', { team: '' });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('ui:title.enterGameResult')}: {game?.data.standing}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <h6 className="text-uppercase text-muted small mb-3">{t('ui:label.halftimeScore')}</h6>
          <Row className="mb-4 align-items-center">
            <Col>
              <Form.Group controlId="halftimeHome">
                <Form.Label className="small">{t('ui:label.homeTeam', { team: homeTeamName })} ({t('ui:label.halftime')})</Form.Label>
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
                <Form.Label className="small">{t('ui:label.awayTeam', { team: awayTeamName })} ({t('ui:label.halftime')})</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={halftimeAway}
                  onChange={(e) => setHalftimeAway(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
          </Row>

          <h6 className="text-uppercase text-muted small mb-3">{t('ui:label.finalScore')}</h6>
          <Row className="mb-3 align-items-center">
            <Col>
              <Form.Group controlId="finalHome">
                <Form.Label className="small">{t('ui:label.homeTeam', { team: homeTeamName })} ({t('ui:label.final')})</Form.Label>
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
                <Form.Label className="small">{t('ui:label.awayTeam', { team: awayTeamName })} ({t('ui:label.final')})</Form.Label>
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
        <Button variant="secondary" onClick={onHide}>{t('ui:button.cancel')}</Button>
        <Button variant="primary" onClick={handleSave}>{t('ui:button.save')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GameResultModal;
