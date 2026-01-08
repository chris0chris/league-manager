/**
 * Tests for TeamSelector component
 *
 * TeamSelector allows selecting a team reference with support for all types:
 * - Group-Team: select group + position (e.g., "0_1")
 * - Standing: select standing + group (e.g., "P1 Gruppe 1")
 * - Result: select winner/loser + match (e.g., "Gewinner HF1")
 * - Static: enter custom name (e.g., "Team Officials")
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamSelector from '../TeamSelector';
import type { TeamReference } from '../../types/designer';

describe('TeamSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSelector = (
    value: TeamReference = { type: 'static', name: '' },
    label = 'Team'
  ) => {
    return render(
      <TeamSelector
        value={value}
        onChange={mockOnChange}
        label={label}
        matchNames={['HF1', 'HF2', 'Spiel 3', 'Finale']}
        groupNames={['Gruppe 1', 'Gruppe 2']}
      />
    );
  };

  describe('type selection', () => {
    it('renders a type selector', () => {
      renderSelector();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('shows all reference types as options', () => {
      renderSelector();

      const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;

      expect(typeSelect).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /group-team/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /standing/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /winner/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /loser/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /static/i })).toBeInTheDocument();
    });

    it('displays the correct type for groupTeam reference', () => {
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe('groupTeam');
    });

    it('displays the correct type for standing reference', () => {
      renderSelector({ type: 'standing', place: 2, groupName: 'Gruppe 1' });

      const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe('standing');
    });
  });

  describe('group-team reference', () => {
    it('shows group and team inputs for groupTeam type', () => {
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      expect(screen.getByLabelText(/group/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
    });

    it('displays current group and team values', () => {
      renderSelector({ type: 'groupTeam', group: 1, team: 2 });

      const groupInput = screen.getByLabelText(/group/i) as HTMLInputElement;
      const teamInput = screen.getByLabelText(/position/i) as HTMLInputElement;

      expect(groupInput.value).toBe('1');
      expect(teamInput.value).toBe('2');
    });

    it('calls onChange with new groupTeam reference when group changes', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      const groupInput = screen.getByLabelText(/group/i);
      await user.clear(groupInput);
      await user.type(groupInput, '2');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('groupTeam');
      expect(lastCall.group).toBe(2);
    });

    it('calls onChange with new groupTeam reference when team changes', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      const teamInput = screen.getByLabelText(/position/i);
      // Just type one more digit to trigger change - value becomes 13
      await user.type(teamInput, '3');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('groupTeam');
      expect(lastCall.team).toBe(13);
    });
  });

  describe('standing reference', () => {
    it('shows place and group inputs for standing type', () => {
      renderSelector({ type: 'standing', place: 1, groupName: 'Gruppe 1' });

      expect(screen.getByLabelText(/place/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    });

    it('displays current place and group values', () => {
      renderSelector({ type: 'standing', place: 2, groupName: 'Gruppe 1' });

      const placeInput = screen.getByLabelText(/place/i) as HTMLInputElement;
      const groupNameInput = screen.getByLabelText(/group name/i) as HTMLInputElement;

      expect(placeInput.value).toBe('2');
      expect(groupNameInput.value).toBe('Gruppe 1');
    });

    it('calls onChange with new standing reference when place changes', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'standing', place: 1, groupName: 'Gruppe 1' });

      const placeInput = screen.getByLabelText(/place/i);
      // Just type one more digit to trigger change - value becomes 12
      await user.type(placeInput, '2');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('standing');
      expect(lastCall.place).toBe(12);
    });
  });

  describe('winner reference', () => {
    it('shows match selector for winner type', () => {
      renderSelector({ type: 'winner', matchName: 'HF1' });

      expect(screen.getByLabelText(/match/i)).toBeInTheDocument();
    });

    it('displays current match name', () => {
      renderSelector({ type: 'winner', matchName: 'HF1' });

      const matchInput = screen.getByLabelText(/match/i) as HTMLInputElement;
      expect(matchInput.value).toBe('HF1');
    });

    it('calls onChange with new winner reference when match changes', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'winner', matchName: 'HF1' });

      const matchInput = screen.getByLabelText(/match/i);
      // Type additional characters to trigger change
      await user.type(matchInput, 'X');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('winner');
      expect(lastCall.matchName).toBe('HF1X');
    });
  });

  describe('loser reference', () => {
    it('shows match selector for loser type', () => {
      renderSelector({ type: 'loser', matchName: 'HF1' });

      expect(screen.getByLabelText(/match/i)).toBeInTheDocument();
    });

    it('displays current match name', () => {
      renderSelector({ type: 'loser', matchName: 'Spiel 3' });

      const matchInput = screen.getByLabelText(/match/i) as HTMLInputElement;
      expect(matchInput.value).toBe('Spiel 3');
    });
  });

  describe('static reference', () => {
    it('shows name input for static type', () => {
      renderSelector({ type: 'static', name: 'Team Officials' });

      expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    });

    it('displays current name', () => {
      renderSelector({ type: 'static', name: 'Team Officials' });

      const nameInput = screen.getByLabelText(/team name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Team Officials');
    });

    it('calls onChange with new static reference when name changes', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'static', name: '' });

      const nameInput = screen.getByLabelText(/team name/i);
      await user.type(nameInput, 'X');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('static');
      expect(lastCall.name).toBe('X');
    });
  });

  describe('type switching', () => {
    it('switches to groupTeam type and creates default reference', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'static', name: 'Test' });

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'groupTeam');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('groupTeam');
      expect(lastCall.group).toBe(0);
      expect(lastCall.team).toBe(0);
    });

    it('switches to standing type and creates default reference', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'static', name: 'Test' });

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'standing');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('standing');
      expect(lastCall.place).toBe(1);
    });

    it('switches to winner type and creates default reference', async () => {
      const user = userEvent.setup();
      renderSelector({ type: 'static', name: 'Test' });

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'winner');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.type).toBe('winner');
      expect(lastCall.matchName).toBeDefined();
    });
  });

  describe('label', () => {
    it('displays the provided label', () => {
      renderSelector({ type: 'static', name: '' }, 'Home Team');

      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });
  });
});
