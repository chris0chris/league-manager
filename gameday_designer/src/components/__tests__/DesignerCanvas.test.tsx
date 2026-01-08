/**
 * Tests for DesignerCanvas component
 *
 * DesignerCanvas is the main container that:
 * - Shows all fields in columns
 * - Renders FieldColumn for each field
 * - Shows empty state message when no fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignerCanvas from '../DesignerCanvas';
import type { Field } from '../../types/designer';

describe('DesignerCanvas', () => {
  const mockOnUpdateFieldName = vi.fn();
  const mockOnRemoveField = vi.fn();
  const mockOnAddGameSlot = vi.fn();
  const mockOnSelectGameSlot = vi.fn();
  const mockOnDeleteGameSlot = vi.fn();
  const mockOnDuplicateGameSlot = vi.fn();

  const field1: Field = {
    id: 'field-1',
    name: 'Feld 1',
    order: 0,
    gameSlots: [
      {
        id: 'slot-1',
        stage: 'Vorrunde',
        standing: 'Gruppe 1',
        home: { type: 'groupTeam', group: 0, team: 0 },
        away: { type: 'groupTeam', group: 0, team: 1 },
        official: { type: 'groupTeam', group: 0, team: 2 },
        breakAfter: 0,
      },
    ],
  };

  const field2: Field = {
    id: 'field-2',
    name: 'Feld 2',
    order: 1,
    gameSlots: [
      {
        id: 'slot-2',
        stage: 'Vorrunde',
        standing: 'Gruppe 2',
        home: { type: 'groupTeam', group: 1, team: 0 },
        away: { type: 'groupTeam', group: 1, team: 1 },
        official: { type: 'groupTeam', group: 1, team: 2 },
        breakAfter: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCanvas = (
    fields: Field[] = [],
    selectedGameSlotId: string | null = null
  ) => {
    return render(
      <DesignerCanvas
        fields={fields}
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

  describe('empty state', () => {
    it('shows empty state message when no fields', () => {
      renderCanvas([]);
      expect(screen.getByText(/no fields yet/i)).toBeInTheDocument();
    });

    it('suggests adding a field in empty state', () => {
      renderCanvas([]);
      expect(screen.getByText(/add field/i)).toBeInTheDocument();
    });
  });

  describe('with fields', () => {
    it('renders FieldColumn for each field', () => {
      renderCanvas([field1, field2]);

      expect(screen.getByDisplayValue('Feld 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Feld 2')).toBeInTheDocument();
    });

    it('renders correct number of FieldColumns', () => {
      renderCanvas([field1, field2]);

      // Each field has a name input
      const fieldInputs = screen.getAllByRole('textbox', { name: /field name/i });
      expect(fieldInputs).toHaveLength(2);
    });

    it('does not show empty state when fields exist', () => {
      renderCanvas([field1]);
      expect(screen.queryByText(/no fields yet/i)).not.toBeInTheDocument();
    });

    it('shows game slots within fields', () => {
      renderCanvas([field1, field2]);

      expect(screen.getByText('Gruppe 1')).toBeInTheDocument();
      expect(screen.getByText('Gruppe 2')).toBeInTheDocument();
    });
  });

  describe('field actions', () => {
    it('passes onUpdateFieldName to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      const input = screen.getByRole('textbox', { name: /field name/i });
      await user.clear(input);
      await user.type(input, 'New Name');

      expect(mockOnUpdateFieldName).toHaveBeenCalled();
      expect(mockOnUpdateFieldName.mock.calls[0][0]).toBe('field-1');
    });

    it('passes onRemoveField to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      await user.click(screen.getByRole('button', { name: /delete field/i }));

      expect(mockOnRemoveField).toHaveBeenCalledWith('field-1');
    });

    it('passes onAddGameSlot to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      await user.click(screen.getByRole('button', { name: /add game/i }));

      expect(mockOnAddGameSlot).toHaveBeenCalledWith('field-1');
    });
  });

  describe('game slot actions', () => {
    it('passes onSelectGameSlot to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      const card = screen.getByRole('article');
      await user.click(card);

      expect(mockOnSelectGameSlot).toHaveBeenCalledWith('slot-1');
    });

    it('passes onDeleteGameSlot to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      await user.click(screen.getByRole('button', { name: /delete game/i }));

      expect(mockOnDeleteGameSlot).toHaveBeenCalledWith('slot-1');
    });

    it('passes onDuplicateGameSlot to FieldColumn', async () => {
      const user = userEvent.setup();
      renderCanvas([field1]);

      await user.click(screen.getByRole('button', { name: /duplicate/i }));

      expect(mockOnDuplicateGameSlot).toHaveBeenCalledWith('slot-1');
    });

    it('passes selectedGameSlotId to FieldColumns', () => {
      renderCanvas([field1], 'slot-1');

      const card = screen.getByRole('article');
      expect(card).toHaveClass('selected');
    });
  });

  describe('layout', () => {
    it('has responsive column layout', () => {
      const { container } = renderCanvas([field1, field2]);

      // Check for row class that indicates column layout
      const row = container.querySelector('.row');
      expect(row).toBeInTheDocument();
    });
  });
});
