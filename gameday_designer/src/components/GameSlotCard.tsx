/**
 * GameSlotCard Component
 *
 * Displays a single game slot with:
 * - Stage and standing information
 * - Home, away, and official team references
 * - Click to select for editing
 * - Delete and duplicate buttons
 * - Visual styling for selected state
 */

import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import type { GameSlot } from '../types/designer';
import { formatTeamReference } from '../utils/teamReference';

export interface GameSlotCardProps {
  /** The game slot data to display */
  gameSlot: GameSlot;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Callback when the card is clicked for selection */
  onSelect: (slotId: string) => void;
  /** Callback when the delete button is clicked */
  onDelete: (slotId: string) => void;
  /** Callback when the duplicate button is clicked */
  onDuplicate: (slotId: string) => void;
}

/**
 * GameSlotCard component.
 * Displays a game slot as a clickable card with team information.
 */
const GameSlotCard: React.FC<GameSlotCardProps> = ({
  gameSlot,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}) => {
  /**
   * Handle card click for selection.
   */
  const handleCardClick = () => {
    onSelect(gameSlot.id);
  };

  /**
   * Handle delete button click.
   * Stops propagation to prevent card selection.
   */
  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(gameSlot.id);
  };

  /**
   * Handle duplicate button click.
   * Stops propagation to prevent card selection.
   */
  const handleDuplicateClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDuplicate(gameSlot.id);
  };

  return (
    <Card
      role="article"
      className={`game-slot-card mb-2 ${isSelected ? 'selected border-primary' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <Card.Header className="d-flex justify-content-between align-items-center py-1">
        <div>
          <Badge bg="secondary" className="me-2">
            {gameSlot.stage}
          </Badge>
          <span className="fw-bold">{gameSlot.standing}</span>
        </div>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleDuplicateClick}
            aria-label="Duplicate game slot"
            title="Duplicate"
            className="me-1"
          >
            <i className="bi bi-copy"></i>
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={handleDeleteClick}
            aria-label="Delete game slot"
            title="Delete"
          >
            <i className="bi bi-trash"></i>
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="py-2">
        <div className="d-flex flex-column gap-1">
          <div className="d-flex justify-content-between">
            <span className="text-muted small">Home:</span>
            <span>{formatTeamReference(gameSlot.home)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted small">Away:</span>
            <span>{formatTeamReference(gameSlot.away)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted small">Official:</span>
            <span>{formatTeamReference(gameSlot.official)}</span>
          </div>
        </div>
        {gameSlot.breakAfter > 0 && (
          <div className="mt-2 text-center">
            <Badge bg="info" className="small">
              <i className="bi bi-clock me-1"></i>
              {gameSlot.breakAfter} min break
            </Badge>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default GameSlotCard;
