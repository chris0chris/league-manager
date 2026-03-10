import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Badge, Stack, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import gamedayApi from '../../api/gamedayApi';
import { Gameday } from '../../types/api';
import { useGamedayContext } from '../../context/GamedayContext';
import { useTypedTranslation } from '../../i18n/i18n';

const GamedayDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTypedTranslation(['ui']);
  const { toolbarProps } = useGamedayContext();
  const addNotification = toolbarProps?.onNotify || ((m: string) => alert(m));

  const [gamedays, setGamedays] = useState<Gameday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const [seasons, setSeasons] = useState<{id: number, name: string}[]>([]);

  const fetchGamedays = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await gamedayApi.listGamedays();
      setGamedays(data);
      
      // Extract unique seasons from gamedays
      const uniqueSeasons = Array.from(new Set(data.map(g => g.season)))
        .map(id => ({ 
          id, 
          name: data.find(g => g.season === id)?.season_display || `Season ${id}` 
        }))
        .sort((a, b) => b.name.localeCompare(a.name));
      setSeasons(uniqueSeasons);
    } catch (error) {
      console.error('Failed to fetch gamedays', error);
      addNotification(t('ui:notification.loadFailed'), 'danger', t('ui:notification.title.error'));
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, t]);

  useEffect(() => {
    fetchGamedays();
  }, [fetchGamedays]);

  const filteredGamedays = useMemo(() => {
    return gamedays.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.league_display.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeason = !seasonFilter || g.season.toString() === seasonFilter;
      const matchesStatus = !statusFilter || g.status === statusFilter;
      
      return matchesSearch && matchesSeason && matchesStatus;
    });
  }, [gamedays, searchTerm, seasonFilter, statusFilter]);

  const handleDeleteGameday = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // We use a non-blocking delete with undo window
    try {
      const gamedayToDelete = gamedays.find(g => g.id === id);
      if (!gamedayToDelete) return;

      // Optimistically remove from UI
      setGamedays(prev => prev.filter(g => g.id !== id));

      let undoTimeout: NodeJS.Timeout;
      let isUndone = false;

      const performDelete = async () => {
        if (isUndone) return;
        try {
          await gamedayApi.deleteGameday(id);
        } catch (error) {
          console.error('Failed to delete gameday', error);
          addNotification(t('ui:notification.deleteGamedayFailed'), 'danger', t('ui:notification.title.error'));
          // Re-add to UI if actual delete fails
          fetchGamedays();
        }
      };

      // Start the 10s timer
      undoTimeout = setTimeout(performDelete, 10000);

      // Show toast with undo button
      // Note: This is a placeholder for actual non-blocking toast logic
      const confirmMsg = t('ui:notification.gamedayDeleted', { name: gamedayToDelete.name });
      // In a real app, the notification system would handle the undo callback
      addNotification(confirmMsg, 'success', t('ui:notification.title.success'));

    } catch (error) {
      console.error('Failed to initiate delete', error);
    }
  };

  const handleCreateGameday = async () => {
    try {
      // Fetch available seasons and leagues first to get valid defaults
      const [seasons, leagues] = await Promise.all([
        gamedayApi.listSeasons(),
        gamedayApi.listLeagues()
      ]);

      if (seasons.length === 0 || leagues.length === 0) {
        addNotification(
          t('ui:error.prerequisitesMissing.message'),
          'warning',
          t('ui:error.prerequisitesMissing.title')
        );
        return;
      }

      const newGameday = await gamedayApi.createGameday({
        name: t('ui:placeholder.gamedayName'),
        date: new Date().toISOString().split('T')[0],
        start: '10:00',
        format: '6_2',
        author: 1, // TODO: Use actual user ID
        address: '',
        season: seasons[0].id,
        league: leagues[0].id,
      });
      navigate(`/designer/${newGameday.id}`);
    } catch (error) {
      console.error('Failed to create gameday', error);
      addNotification(t('ui:notification.createGamedayFailed'), 'danger', t('ui:notification.title.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge bg="secondary" className="text-uppercase">{t('domain:status.draft')}</Badge>;
      case 'PUBLISHED': return <Badge bg="primary" className="text-uppercase">{t('domain:status.published')}</Badge>;
      case 'IN_PROGRESS': return <Badge bg="warning" text="dark" className="text-uppercase">{t('domain:status.inProgress')}</Badge>;
      case 'COMPLETED': return <Badge bg="success" className="text-uppercase">{t('domain:status.completed')}</Badge>;
      default: return <Badge bg="light" text="dark" className="text-uppercase">{status}</Badge>;
    }
  };

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="display-5 fw-bold mb-2">{t('ui:title.gamedayDashboard')}</h1>
          <p className="text-muted lead">{t('ui:message.manageTournaments')}</p>
        </div>
        <Button variant="primary" size="lg" className="px-4 shadow-sm" onClick={handleCreateGameday}>
          <i className="bi bi-plus-lg me-2" />
          {t('ui:button.createNewGameday')}
        </Button>
      </div>

      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col md={6}>
              <Form.Group controlId="search">
                <Form.Label className="small fw-bold text-uppercase text-muted">{t('ui:label.search')}</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-white border-end-0">
                    <i className="bi bi-search text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    className="border-start-0 ps-0"
                    placeholder={t('ui:placeholder.searchGamedays')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="seasonFilter">
                <Form.Label className="small fw-bold text-uppercase text-muted">{t('ui:label.season')}</Form.Label>
                <Form.Select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                  <option value="">{t('ui:placeholder.allSeasons')}</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id.toString()}>{s.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="statusFilter">
                <Form.Label className="small fw-bold text-uppercase text-muted">{t('ui:label.status')}</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t('ui:placeholder.allStatuses')}</option>
                  <option value="DRAFT">{t('domain:status.draft')}</option>
                  <option value="PUBLISHED">{t('domain:status.published')}</option>
                  <option value="IN_PROGRESS">{t('domain:status.inProgress')}</option>
                  <option value="COMPLETED">{t('domain:status.completed')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">{t('ui:message.loadingGamedays')}</p>
        </div>
      ) : filteredGamedays.length > 0 ? (
        <Row xs={1} md={2} lg={3} className="g-4">
          {filteredGamedays.map((gameday) => (
            <Col key={gameday.id}>
              <Card 
                className="h-100 shadow-sm border-0 gameday-card position-relative" 
                onClick={() => navigate(`/designer/${gameday.id}`)}
                role="button"
              >
                <div className="position-absolute top-0 end-0 p-3 z-1">
                  {getStatusBadge(gameday.status)}
                </div>
                <Card.Body className="p-4 d-flex flex-column">
                  <div className="mb-3">
                    <small className="text-primary fw-bold text-uppercase letter-spacing-1">
                      {gameday.season_display} • {gameday.league_display}
                    </small>
                    <Card.Title className="h4 mt-1 fw-bold">{gameday.name}</Card.Title>
                  </div>
                  
                  <Stack gap={2} className="mt-auto mb-4 text-muted small">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-calendar3 me-2" />
                      {new Date(gameday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-clock me-2" />
                      {gameday.start.substring(0, 5)} {t('ui:label.clock')}
                    </div>
                    {gameday.address && (
                      <div className="d-flex align-items-center">
                        <i className="bi bi-geo-alt me-2" />
                        <span className="text-truncate">{gameday.address}</span>
                      </div>
                    )}
                  </Stack>

                  <div className="d-flex gap-2">
                    <Button variant="outline-primary" className="flex-grow-1">
                      {t('ui:button.openDesigner')}
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      onClick={(e) => handleDeleteGameday(gameday.id, e)}
                      disabled={gameday.status !== 'DRAFT'}
                      title={gameday.status !== 'DRAFT' ? t('ui:tooltip.unlockToDelete') : ''}
                    >
                      <i className="bi bi-trash" />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="text-center py-5 border-0 shadow-sm">
          <Card.Body>
            <div className="mb-4">
              <i className="bi bi-calendar-x display-1 text-light" />
            </div>
            <h3>{searchTerm || seasonFilter || statusFilter ? t('ui:message.noGamedaysFound') : t('ui:message.noGamedaysYet')}</h3>
            <p className="text-muted">{t('ui:message.startByCreating')}</p>
            {(searchTerm || seasonFilter || statusFilter) && (
              <Button 
                variant="link" 
                onClick={() => {setSearchTerm(''); setSeasonFilter(''); setStatusFilter('');}}
              >
                {t('ui:button.clearFilters')}
              </Button>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default GamedayDashboard;
