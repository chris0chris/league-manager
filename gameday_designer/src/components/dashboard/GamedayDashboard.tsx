/**
 * GamedayDashboard Component
 *
 * Main landing page for Gameday Management.
 * Displays a list of gamedays and allows creating new ones.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Button, Spinner, Form, InputGroup } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import { gamedayApi } from '../../api/gamedayApi';
import type { GamedayListEntry } from '../../types';
import GamedayCard from './GamedayCard';

const GamedayDashboard: React.FC = () => {
  const { t } = useTypedTranslation(['ui']);
  const navigate = useNavigate();
  const location = useLocation();
  const [gamedays, setGamedays] = useState<GamedayListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [undoTimers, setUndoTimers] = useState<Record<number, NodeJS.Timeout>>({});
  const hasTriggeredInitialDelete = useRef(false);

  useEffect(() => {
    loadGamedays();
    return () => {
      // Cleanup timers on unmount
      Object.values(undoTimers).forEach(timer => clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle pending delete from navigation state
  useEffect(() => {
    if (!loading && gamedays.length > 0 && !hasTriggeredInitialDelete.current) {
      const state = location.state as { pendingDeleteId?: number } | null;
      if (state?.pendingDeleteId) {
        handleDelete(state.pendingDeleteId);
        // Clear location state so it doesn't trigger again on refresh
        navigate(location.pathname, { replace: true, state: {} });
        hasTriggeredInitialDelete.current = true;
      }
    }
  }, [loading, gamedays, location.state, navigate, location.pathname]);

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

  const handleDelete = (id: number) => {
    setDeletedIds(prev => new Set(prev).add(id));
    
    const timer = setTimeout(async () => {
      try {
        await gamedayApi.deleteGameday(id);
        // After successful delete, remove from gamedays list and cleanup state
        setGamedays(prev => prev.filter(g => g.id !== id));
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setUndoTimers(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      } catch (error) {
        console.error('Failed to delete gameday', error);
        // Revert UI on error
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }, 10000); // 10 seconds

    setUndoTimers(prev => ({ ...prev, [id]: timer }));
  };

  const handleUndo = (id: number) => {
    const timer = undoTimers[id];
    if (timer) {
      clearTimeout(timer);
      setUndoTimers(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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
            gamedays.map((gameday) => {
              if (deletedIds.has(gameday.id)) {
                return (
                  <Col key={gameday.id} xs={12} sm={6} lg={4} xl={3} className="mb-4">
                    <div className="h-100 p-3 bg-light rounded border border-dashed d-flex flex-column align-items-center justify-content-center text-center shadow-sm">
                      <p className="mb-2 text-muted small">Gameday marked for deletion</p>
                      <Button variant="outline-primary" size="sm" onClick={() => handleUndo(gameday.id)} className="px-3">
                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                        Undo
                      </Button>
                    </div>
                  </Col>
                );
              }
              return (
                <GamedayCard 
                  key={gameday.id} 
                  gameday={gameday} 
                  onClick={handleCardClick}
                  onDelete={handleDelete}
                />
              );
            })
          ) : (
            <Col>
              <div className="text-center py-5 text-muted bg-light rounded border border-dashed">
                <i className="bi bi-calendar-x display-1 mb-3 d-block text-secondary opacity-25"></i>
                <h2 className="h4 mb-3">No gamedays found</h2>
                <p className="mb-4">Get started by creating your first tournament gameday.</p>
                <Button variant="primary" size="lg" onClick={handleCreateGameday} className="px-5 shadow-sm">
                  <i className="bi bi-plus-lg me-2"></i>
                  {t('ui:button.createGameday', 'Create Gameday')}
                </Button>
              </div>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default GamedayDashboard;
