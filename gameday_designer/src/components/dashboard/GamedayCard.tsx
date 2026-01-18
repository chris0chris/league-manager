/**
 * GamedayCard Component
 *
 * Displays a single gameday as a card in the dashboard grid.
 */

import React from 'react';
import { Card, Badge, Col } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import type { GamedayListEntry } from '../../types';

interface GamedayCardProps {
  gameday: GamedayListEntry;
  onClick: (id: number) => void;
  onDelete: (id: number) => void;
}

const GamedayCard: React.FC<GamedayCardProps> = ({ gameday, onClick, onDelete }) => {
  const { t } = useTypedTranslation(['ui', 'domain']);

  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT': return 'warning text-dark';
      case 'PUBLISHED': return 'success';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'secondary';
      default: return 'light text-muted border';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`domain:status.${(status || 'DRAFT').toLowerCase()}`, status);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(gameday.id);
  };

  return (
    <Col xs={12} sm={6} lg={4} xl={3} className="mb-4">
      <Card 
        className="h-100 shadow-sm cursor-pointer hover-lift position-relative" 
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
            <div className="d-flex align-items-center">
              <small className="text-muted me-2">{gameday.season_display}</small>
              <button 
                className="btn text-muted btn-destructive-hover delete-button-grow"
                onClick={handleDelete}
                title={t('ui:button.deleteGameday')}
                style={{ 
                  lineHeight: 1, 
                  padding: '6px 8px', 
                  fontSize: '1.1rem',
                  transition: 'transform 0.2s ease-in-out' 
                }}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
          
          <Card.Title className="text-truncate" title={gameday.name}>
            {gameday.name}
          </Card.Title>
          
          <div className="mt-3 text-muted small">
            <span>{formatDate(gameday.date)}</span>
            {gameday.league_display && (
              <>
                <span className="mx-2">•</span>
                <span>{gameday.league_display}</span>
              </>
            )}
            {gameday.address && (
              <>
                <span className="mx-2">•</span>
                <span className="text-truncate" title={gameday.address}>
                  {gameday.address}
                </span>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default GamedayCard;
