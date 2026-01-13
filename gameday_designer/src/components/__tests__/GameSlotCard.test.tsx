/**
 * Tests for GameSlotCard component
 *
 * GameSlotCard displays a single game slot with:
 * - Stage and standing information
 * - Home, away, and official team references
 * - Click to select for editing
 * - Delete and duplicate buttons
 * - Visual styling for selected state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameSlotCard from '../GameSlotCard';
import type { GameSlot } from '../../types/designer';

describe('GameSlotCard', () => {
  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnDuplicate = vi.fn();

  const defaultGameSlot: GameSlot = {
    id: 'slot-1',
    stage: 'Preliminary',
    standing: 'Gruppe 1',
    home: { type: 'groupTeam', group: 0, team: 0 },
    away: { type: 'groupTeam', group: 0, team: 1 },
    official: { type: 'groupTeam', group: 0, team: 2 },
    breakAfter: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderGameSlotCard = (
    gameSlot: GameSlot = defaultGameSlot,
    isSelected = false
  ) => {
    return render(
      <GameSlotCard
        gameSlot={gameSlot}
        isSelected={isSelected}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    );
  };

  describe('display', () => {
    it('displays the stage', () => {
      renderGameSlotCard();
      expect(screen.getByText('Preliminary')).toBeInTheDocument();
    });

    it('displays the standing', () => {
      renderGameSlotCard();
      expect(screen.getByText('Gruppe 1')).toBeInTheDocument();
    });

    it('displays the home team reference', () => {
      renderGameSlotCard();
      expect(screen.getByText('0_0')).toBeInTheDocument();
    });

    it('displays the away team reference', () => {
      renderGameSlotCard();
      expect(screen.getByText('0_1')).toBeInTheDocument();
    });

    it('displays the official team reference', () => {
      renderGameSlotCard();
      expect(screen.getByText('0_2')).toBeInTheDocument();
    });

    it('displays labels for home, away, and official', () => {
      renderGameSlotCard();
      expect(screen.getByText(/home/i)).toBeInTheDocument();
      expect(screen.getByText(/away/i)).toBeInTheDocument();
      expect(screen.getByText(/official/i)).toBeInTheDocument();
    });

    it('displays standing reference format correctly', () => {
      const gameSlot: GameSlot = {
        ...defaultGameSlot,
        home: { type: 'standing', place: 2, groupName: 'Gruppe 1' },
      };
      renderGameSlotCard(gameSlot);
      expect(screen.getByText('P2 Gruppe 1')).toBeInTheDocument();
    });

    it('displays winner reference format correctly', () => {
      const gameSlot: GameSlot = {
        ...defaultGameSlot,
        home: { type: 'winner', matchName: 'HF1' },
      };
      renderGameSlotCard(gameSlot);
      expect(screen.getByText('Gewinner HF1')).toBeInTheDocument();
    });

    it('displays loser reference format correctly', () => {
      const gameSlot: GameSlot = {
        ...defaultGameSlot,
        home: { type: 'loser', matchName: 'HF1' },
      };
      renderGameSlotCard(gameSlot);
      expect(screen.getByText('Verlierer HF1')).toBeInTheDocument();
    });

    it('displays static reference format correctly', () => {
      const gameSlot: GameSlot = {
        ...defaultGameSlot,
        official: { type: 'static', name: 'Team Officials' },
      };
      renderGameSlotCard(gameSlot);
      expect(screen.getByText('Team Officials')).toBeInTheDocument();
    });

    it('shows break time when set', () => {
      const gameSlot: GameSlot = {
        ...defaultGameSlot,
        breakAfter: 15,
      };
      renderGameSlotCard(gameSlot);
      expect(screen.getByText(/15 min/i)).toBeInTheDocument();
    });

    it('does not show break time when zero', () => {
      renderGameSlotCard();
      expect(screen.queryByText(/\d+ min/i)).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onSelect with game slot ID when clicked', async () => {
      const user = userEvent.setup();
      renderGameSlotCard();

      await user.click(screen.getByRole('article'));

      expect(mockOnSelect).toHaveBeenCalledWith('slot-1');
    });

    it('applies selected styling when isSelected is true', () => {
      renderGameSlotCard(defaultGameSlot, true);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('selected');
    });

    it('does not apply selected styling when isSelected is false', () => {
      renderGameSlotCard(defaultGameSlot, false);

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('selected');
    });
  });

  describe('actions', () => {
    it('has a delete button', () => {
      renderGameSlotCard();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onDelete with game slot ID when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderGameSlotCard();

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(mockOnDelete).toHaveBeenCalledWith('slot-1');
    });

    it('delete button click does not trigger onSelect', async () => {
      const user = userEvent.setup();
      renderGameSlotCard();

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('has a duplicate button', () => {
      renderGameSlotCard();
      expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    });

    it('calls onDuplicate with game slot ID when duplicate button is clicked', async () => {
      const user = userEvent.setup();
      renderGameSlotCard();

      await user.click(screen.getByRole('button', { name: /duplicate/i }));

      expect(mockOnDuplicate).toHaveBeenCalledWith('slot-1');
    });

    it('duplicate button click does not trigger onSelect', async () => {
      const user = userEvent.setup();
      renderGameSlotCard();

      await user.click(screen.getByRole('button', { name: /duplicate/i }));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role article for the card', () => {
      renderGameSlotCard();
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has accessible name for delete button', () => {
      renderGameSlotCard();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('has accessible name for duplicate button', () => {
      renderGameSlotCard();
      expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    });
  });
});
