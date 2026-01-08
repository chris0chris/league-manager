/**
 * Tests for GameSlotEditor component
 *
 * GameSlotEditor is a modal for editing game slot details:
 * - Stage (Vorrunde, Finalrunde, custom)
 * - Standing (match identifier)
 * - Home, Away, Official team references
 * - Break time after game
 * - Save and Cancel buttons
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameSlotEditor from '../GameSlotEditor';
import type { GameSlot } from '../../types/designer';

describe('GameSlotEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultGameSlot: GameSlot = {
    id: 'slot-1',
    stage: 'Vorrunde',
    standing: 'Gruppe 1',
    home: { type: 'groupTeam', group: 0, team: 0 },
    away: { type: 'groupTeam', group: 0, team: 1 },
    official: { type: 'groupTeam', group: 0, team: 2 },
    breakAfter: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEditor = (
    gameSlot: GameSlot | null = defaultGameSlot,
    show = true
  ) => {
    return render(
      <GameSlotEditor
        show={show}
        gameSlot={gameSlot}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        matchNames={['HF1', 'HF2', 'Spiel 3', 'Finale']}
        groupNames={['Gruppe 1', 'Gruppe 2']}
      />
    );
  };

  describe('visibility', () => {
    it('shows the modal when show is true', () => {
      renderEditor();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('hides the modal when show is false', () => {
      renderEditor(defaultGameSlot, false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles null gameSlot gracefully when not shown', () => {
      renderEditor(null, false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('form fields', () => {
    it('displays stage input with current value', () => {
      renderEditor();
      const stageInput = screen.getByLabelText(/stage/i) as HTMLSelectElement;
      expect(stageInput.value).toBe('Vorrunde');
    });

    it('displays standing input with current value', () => {
      renderEditor();
      const standingInput = screen.getByLabelText(/standing/i) as HTMLInputElement;
      expect(standingInput.value).toBe('Gruppe 1');
    });

    it('displays home team selector', () => {
      renderEditor();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('displays away team selector', () => {
      renderEditor();
      expect(screen.getByText('Away')).toBeInTheDocument();
    });

    it('displays official team selector', () => {
      renderEditor();
      expect(screen.getByText('Official')).toBeInTheDocument();
    });

    it('displays break time input', () => {
      renderEditor();
      const breakInput = screen.getByLabelText(/break/i) as HTMLInputElement;
      expect(breakInput.value).toBe('0');
    });

    it('shows break time when set', () => {
      const slotWithBreak: GameSlot = {
        ...defaultGameSlot,
        breakAfter: 15,
      };
      renderEditor(slotWithBreak);
      const breakInput = screen.getByLabelText(/break/i) as HTMLInputElement;
      expect(breakInput.value).toBe('15');
    });
  });

  describe('stage options', () => {
    it('has Vorrunde option', () => {
      renderEditor();
      // Option text is now translated to "Preliminary Round"
      expect(screen.getByRole('option', { name: 'Preliminary Round' })).toBeInTheDocument();
    });

    it('has Finalrunde option', () => {
      renderEditor();
      // Option text is now translated to "Final Round"
      expect(screen.getByRole('option', { name: 'Final Round' })).toBeInTheDocument();
    });
  });

  describe('save action', () => {
    it('has a Save button', () => {
      renderEditor();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('calls onSave with updated game slot when Save is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        id: 'slot-1',
        stage: 'Vorrunde',
        standing: 'Gruppe 1',
      }));
    });

    it('saves changes made to stage', async () => {
      const user = userEvent.setup();
      renderEditor();

      await user.selectOptions(screen.getByLabelText(/stage/i), 'Finalrunde');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'Finalrunde',
      }));
    });

    it('saves changes made to standing', async () => {
      const user = userEvent.setup();
      renderEditor();

      const standingInput = screen.getByLabelText(/standing/i);
      await user.clear(standingInput);
      await user.type(standingInput, 'HF1');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        standing: 'HF1',
      }));
    });
  });

  describe('cancel action', () => {
    it('has a Cancel button', () => {
      renderEditor();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onSave when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderEditor();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('modal title', () => {
    it('displays Edit Game title', () => {
      renderEditor();
      expect(screen.getByText(/edit game/i)).toBeInTheDocument();
    });
  });
});
