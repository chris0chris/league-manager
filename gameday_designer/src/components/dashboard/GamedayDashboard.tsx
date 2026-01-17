/**
 * GamedayDashboard Component
 *
 * Main landing page for Gameday Management.
 * Displays a list of gamedays and allows creating new ones.
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Spinner, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import { gamedayApi } from '../../api/gamedayApi';
import type { GamedayListEntry } from '../../types';
import GamedayCard from './GamedayCard';

const GamedayDashboard: React.FC = () => {
  const { t } = useTypedTranslation(['ui']);
  const navigate = useNavigate();
  const [gamedays, setGamedays] = useState<GamedayListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGamedays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadGamedays = async () => {
    setLoading(true);
    try {
      const response = await gamedayApi.listGamedays({ search });
      setGamedays(response.results);
    } catch (error) {
      console.error('Failed to load gamedays', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGameday = async () => {
    try {
      const newGameday = await gamedayApi.createGameday({});
      navigate(`/designer/${newGameday.id}`);
    } catch (error) {
      console.error('Failed to create gameday', error);
    }
  };

  const handleCardClick = (id: number) => {
    navigate(`/designer/${id}`);
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h1 className="h3 mb-0">Gameday Management</h1>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleCreateGameday}>
            <i className="bi bi-plus-lg me-2"></i>
            {t('ui:button.createGameday', 'Create Gameday')}
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6} lg={4}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              placeholder={t('ui:placeholder.searchGamedays', 'Search gamedays...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Form.Text className="text-muted">
            Tip: Use <code>season:2026</code> or <code>status:draft</code> for precise filtering.
          </Form.Text>
        </Col>
      </Row>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <Row>
          {gamedays.length > 0 ? (
            gamedays.map((gameday) => (
              <GamedayCard 
                key={gameday.id} 
                gameday={gameday} 
                onClick={handleCardClick} 
              />
            ))
          ) : (
            <Col>
              <div className="text-center py-5 text-muted">
                <i className="bi bi-calendar-x display-4 mb-3 d-block"></i>
                <p>No gamedays found.</p>
              </div>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default GamedayDashboard;
