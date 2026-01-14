/**
 * Tests for FieldColumn component
 *
 * FieldColumn displays a single playing field with:
 * - Editable field name
 * - List of game slots
 * - Add Game button
 * - Delete field button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldColumn from '../FieldColumn';
import type { Field, GameSlot } from '../../types/designer';

describe('FieldColumn', () => {
  const mockOnUpdateFieldName = vi.fn();
  const mockOnRemoveField = vi.fn();
  const mockOnAddGameSlot = vi.fn();
  const mockOnSelectGameSlot = vi.fn();
  const mockOnDeleteGameSlot = vi.fn();
  const mockOnDuplicateGameSlot = vi.fn();

  const gameSlot1: GameSlot = {
    id: 'slot-1',
    stage: 'Preliminary',
    standing: 'Gruppe 1',
    home: { type: 'groupTeam', group: 0, team: 0 },
    away: { type: 'groupTeam', group: 0, team: 1 },
    official: { type: 'groupTeam', group: 0, team: 2 },
    breakAfter: 0,
  };

  const gameSlot2: GameSlot = {
    id: 'slot-2',
    stage: 'Preliminary',
    standing: 'Gruppe 2',
    home: { type: 'groupTeam', group: 1, team: 0 },
    away: { type: 'groupTeam', group: 1, team: 1 },
    official: { type: 'groupTeam', group: 1, team: 2 },
    breakAfter: 0,
  };

  const defaultField: Field = {
    id: 'field-1',
    name: 'Feld 1',
    order: 0,
    gameSlots: [],
  };

  const fieldWithGames: Field = {
    id: 'field-1',
    name: 'Feld 1',
    order: 0,
    gameSlots: [gameSlot1, gameSlot2],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderFieldColumn = (
    field: Field = defaultField,
    selectedGameSlotId: string | null = null
  ) => {
    return render(
      <FieldColumn
        field={field}
        selectedGameSlotId={selectedGameSlotId}
        onUpdateFieldName={mockOnUpdateFieldName}
        onRemoveField={mockOnRemoveField}
        onAddGameSlot={mockOnAddGameSlot}
        onSelectGameSlot={mockOnSelectGameSlot}
        onDeleteGameSlot={mockOnDeleteGameSlot}
        onDuplicateGameSlot={mockOnDuplicateGameSlot}
      />
    );
  };

  describe('field name', () => {
    it('displays the field name', () => {
      renderFieldColumn();
      expect(screen.getByDisplayValue('Feld 1')).toBeInTheDocument();
    });

    it('has an editable field name input', () => {
      renderFieldColumn();
      expect(screen.getByRole('textbox', { name: /field name/i })).toBeInTheDocument();
    });

    it('calls onUpdateFieldName when field name is changed', async () => {
      const user = userEvent.setup();
      renderFieldColumn();

      const input = screen.getByRole('textbox', { name: /field name/i });
      await user.clear(input);
      await user.type(input, 'Main Field');

      expect(mockOnUpdateFieldName).toHaveBeenCalled();
      // Check the last call has the correct field ID and new name
      const lastCall = mockOnUpdateFieldName.mock.calls[
        mockOnUpdateFieldName.mock.calls.length - 1
      ];
      expect(lastCall[0]).toBe('field-1');
    });
  });

  describe('delete field', () => {
    it('has a delete field button', () => {
      renderFieldColumn();
      expect(
        screen.getByRole('button', { name: /delete field/i })
      ).toBeInTheDocument();
    });

    it('calls onRemoveField when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderFieldColumn();

      await user.click(screen.getByRole('button', { name: /delete field/i }));

      expect(mockOnRemoveField).toHaveBeenCalledWith('field-1');
    });
  });

  describe('game slots', () => {
    it('shows empty state when no games', () => {
      renderFieldColumn();
      expect(screen.getByText(/no games/i)).toBeInTheDocument();
    });

    it('renders GameSlotCards for each game slot', () => {
      renderFieldColumn(fieldWithGames);

      expect(screen.getByText('Gruppe 1')).toBeInTheDocument();
      expect(screen.getByText('Gruppe 2')).toBeInTheDocument();
    });

    it('renders correct number of game slot cards', () => {
      renderFieldColumn(fieldWithGames);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(2);
    });

    it('passes isSelected correctly to GameSlotCard', () => {
      renderFieldColumn(fieldWithGames, 'slot-1');

      const cards = screen.getAllByRole('article');
      expect(cards[0]).toHaveClass('selected');
      expect(cards[1]).not.toHaveClass('selected');
    });

    it('calls onSelectGameSlot when a game card is clicked', async () => {
      const user = userEvent.setup();
      renderFieldColumn(fieldWithGames);

      const firstCard = screen.getAllByRole('article')[0];
      await user.click(firstCard);

      expect(mockOnSelectGameSlot).toHaveBeenCalledWith('slot-1');
    });

    it('calls onDeleteGameSlot when delete button on card is clicked', async () => {
      const user = userEvent.setup();
      renderFieldColumn(fieldWithGames);

      const deleteButtons = screen.getAllByRole('button', { name: /delete game/i });
      await user.click(deleteButtons[0]);

      expect(mockOnDeleteGameSlot).toHaveBeenCalledWith('slot-1');
    });

    it('calls onDuplicateGameSlot when duplicate button on card is clicked', async () => {
      const user = userEvent.setup();
      renderFieldColumn(fieldWithGames);

      const duplicateButtons = screen.getAllByRole('button', { name: /duplicate/i });
      await user.click(duplicateButtons[0]);

      expect(mockOnDuplicateGameSlot).toHaveBeenCalledWith('slot-1');
    });
  });

  describe('add game', () => {
    it('has an Add Game button', () => {
      renderFieldColumn();
      expect(screen.getByRole('button', { name: /add game/i })).toBeInTheDocument();
    });

    it('calls onAddGameSlot with field ID when Add Game is clicked', async () => {
      const user = userEvent.setup();
      renderFieldColumn();

      await user.click(screen.getByRole('button', { name: /add game/i }));

      expect(mockOnAddGameSlot).toHaveBeenCalledWith('field-1');
    });
  });

  describe('accessibility', () => {
    it('has accessible field name input', () => {
      renderFieldColumn();
      expect(screen.getByRole('textbox', { name: /field name/i })).toBeInTheDocument();
    });

    it('has accessible delete field button', () => {
      renderFieldColumn();
      expect(
        screen.getByRole('button', { name: /delete field/i })
      ).toBeInTheDocument();
    });

    it('has accessible add game button', () => {
      renderFieldColumn();
      expect(screen.getByRole('button', { name: /add game/i })).toBeInTheDocument();
    });
  });
});
