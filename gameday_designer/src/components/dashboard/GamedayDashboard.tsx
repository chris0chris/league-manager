import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Row, Col, Button, Spinner, Form, InputGroup, Card } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import { gamedayApi } from '../../api/gamedayApi';
import type { GamedayListEntry } from '../../types';
import type { Notification, NotificationType } from '../../types/designer';
import GamedayCard from './GamedayCard';
import NotificationToast from '../NotificationToast';
import { v4 as uuidv4 } from 'uuid';
import { ProgressBar } from 'react-bootstrap';

/**
 * Placeholder component for a gameday card marked for deletion.
 */
const GamedayDeletePlaceholder: React.FC<{ 
  gameday: GamedayListEntry; 
  onUndo: (id: number) => void;
  duration: number;
}> = ({ gameday, onUndo, duration }) => {
  const { t } = useTypedTranslation(['ui']);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <Col xs={12} sm={6} lg={4} xl={3} className="mb-4">
      <Card 
        className="h-100 bg-light border-dashed shadow-sm position-relative overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center p-0">
          <div style={{ height: '80px' }} className="d-flex align-items-center justify-content-center w-100">
            {isHovered ? (
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => onUndo(gameday.id)} 
                className="px-4 shadow-sm animate-in"
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                {t('ui:label.undo')}
              </Button>
            ) : (
              <i className="bi bi-trash3 text-muted opacity-25 animate-in" style={{ fontSize: '2.5rem' }}></i>
            )}
          </div>
          
          <div className="position-absolute bottom-0 start-0 w-100">
            <ProgressBar 
              now={progress} 
              variant="warning" 
              style={{ height: '4px', borderRadius: 0 }} 
              className="bg-transparent"
            />
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

const GamedayDashboard: React.FC = () => {
  const { t } = useTypedTranslation(['ui']);
  const navigate = useNavigate();
  const location = useLocation();
  const [gamedays, setGamedays] = useState<GamedayListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef<Record<number, NodeJS.Timeout>>({});
  const hasTriggeredInitialDelete = useRef(false);

  const addNotification = useCallback((message: string, type: NotificationType = 'info', title?: string, undoAction?: () => void, duration?: number) => {
    const id = uuidv4();
    setNotifications((prev) => [
      ...prev,
      { id, message, type, title, show: true, undoAction, duration }
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, show: false } : n));
    // Clean up after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  const loadGamedays = async () => {
    setLoading(true);
    try {
      const response = await gamedayApi.listGamedays({ search: searchTerm });
      setGamedays(response.results);
    } catch (error) {
      console.error('Failed to load gamedays', error);
      addNotification(t('ui:notification.loadGamedaysFailed'), 'danger', t('ui:notification.title.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGameday = async () => {
    try {
      const newGameday = await gamedayApi.createGameday({
        name: t('ui:placeholder.gamedayName'),
        date: new Date().toISOString().split('T')[0],
        start: '10:00',
        format: '6_2',
        author: 1, // TODO: Use actual user ID
        address: '',
        season: 1, // TODO: Use actual season ID
        league: 1, // TODO: Use actual league ID
      });
      navigate(`/designer/${newGameday.id}`);
    } catch (error) {
      console.error('Failed to create gameday', error);
      addNotification(t('ui:notification.createGamedayFailed'), 'danger', t('ui:notification.title.error'));
    }
  };

  const handleCardClick = (id: number) => {
    navigate(`/designer/${id}`);
  };

  const handleUndo = useCallback((id: number) => {
    const timer = timeoutRefs.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timeoutRefs.current[id];
      
      // Remove from deleted IDs - creating NEW set to ensure React detects change
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      // Explicitly trigger a list refresh by updating state with a new array reference
      setGamedays(prev => [...prev]);
    }
  }, []);

  const handleDelete = useCallback((id: number) => {
    const deleteDuration = 10000;

    // Add to deleted IDs immediately to show placeholder
    setDeletedIds(prev => new Set(prev).add(id));
    
    const timer = setTimeout(async () => {
      try {
        await gamedayApi.deleteGameday(id);
        // After successful permanent delete, remove from gamedays list and cleanup state
        setGamedays(prev => prev.filter(g => g.id !== id));
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        delete timeoutRefs.current[id];
      } catch (error) {
        console.error('Failed to delete gameday permanently', error);
        addNotification(t('ui:notification.deleteGamedayPermanentlyFailed'), 'danger', t('ui:notification.title.error'));
        // On failure, restore it to the list
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }, deleteDuration);

    timeoutRefs.current[id] = timer;
    
    // Show simplified Toast
    const gamedayName = gamedays.find(g => g.id === id)?.name || t('ui:message.gameday');
    addNotification(
      t('ui:notification.gamedayDeleted', { name: gamedayName }),
      'warning',
      t('ui:notification.title.deletion'),
      undefined, // No undo on toast anymore, it's on the card
      deleteDuration
    );
  }, [gamedays, addNotification, t]);

  useEffect(() => {
    loadGamedays();
    return () => {
      // Cleanup timers on unmount
      Object.values(timeoutRefs.current).forEach(timer => clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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
  }, [loading, gamedays, location.state, navigate, location.pathname, handleDelete]);

  return (
    <Container fluid className="py-2">
      <Row className="mb-4 align-items-center">
        <Col>
          <p className="text-muted lead mb-0">{t('ui:message.dashboardSubtitle')}</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleCreateGameday}>
            <i className="bi bi-plus-lg me-2"></i>
            {t('ui:button.createGameday')}
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6} lg={4}>
          <Form.Group className="position-relative">
            <Form.Control
              type="text"
              placeholder={t('ui:placeholder.searchGamedays')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-5"
            />
            <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
          </Form.Group>
          <Form.Text className="text-muted">
            {t('ui:message.filteringTip')}
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
              const isDeleted = deletedIds.has(gameday.id);
              // Hide deleted gamedays from list (they are shown as placeholder anyway)
              if (isDeleted) {
                return (
                  <GamedayDeletePlaceholder 
                    key={gameday.id} 
                    gameday={gameday} 
                    onUndo={handleUndo} 
                    duration={10000}
                  />
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
                <h2 className="h4 mb-3">{t('ui:message.noGamedaysFound')}</h2>
                <p className="mb-4">{t('ui:message.getStartedMessage')}</p>
                <Button variant="primary" size="lg" onClick={handleCreateGameday} className="px-5 shadow-sm">
                  <i className="bi bi-plus-lg me-2"></i>
                  {t('ui:button.createGameday')}
                </Button>
              </div>
            </Col>
          )}
        </Row>
      )}
      <NotificationToast notifications={notifications} onClose={dismissNotification} />
    </Container>
  );
};

export default GamedayDashboard;
