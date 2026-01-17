/**
 * GamedayCard Component
 *
 * Displays a single gameday as a card in the dashboard grid.
 */

import React from 'react';
import { Card, Badge, Col } from 'react-bootstrap';
import type { GamedayListEntry } from '../../types';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';

interface GamedayCardProps {
  gameday: GamedayListEntry;
  onClick: (id: number) => void;
}

const GamedayCard: React.FC<GamedayCardProps> = ({ gameday, onClick }) => {
  const { t } = useTypedTranslation(['ui']);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'scheduled': return 'primary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    // In a real app, these would be translated keys like 'ui:status.draft'
    // For now, we'll capitalize as per tests
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Col xs={12} sm={6} lg={4} xl={3} className="mb-4">
      <Card 
        className="h-100 shadow-sm cursor-pointer hover-lift" 
        onClick={() => onClick(gameday.id)}
        role="button"
        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <Badge bg={getStatusVariant(gameday.status)}>
              {getStatusLabel(gameday.status)}
            </Badge>
            <small className="text-muted">{gameday.season_display}</small>
          </div>
          
          <Card.Title className="text-truncate" title={gameday.name}>
            {gameday.name}
          </Card.Title>
          
          <div className="mt-3">
            <div className="d-flex align-items-center mb-1 text-muted">
              <i className="bi bi-calendar-event me-2"></i>
              <span>{formatDate(gameday.date)}</span>
            </div>
            {gameday.league_display && (
              <div className="d-flex align-items-center text-muted">
                <i className="bi bi-trophy me-2"></i>
                <span>{gameday.league_display}</span>
              </div>
            )}
          </div>
        </Card.Body>
        <Card.Footer className="bg-transparent border-top-0 pt-0">
          <small className="text-muted">
            {gameday.address && (
              <span className="text-truncate d-block" title={gameday.address}>
                <i className="bi bi-geo-alt me-1"></i>
                {gameday.address}
              </span>
            )}
          </small>
        </Card.Footer>
      </Card>
    </Col>
  );
};

export default GamedayCard;
