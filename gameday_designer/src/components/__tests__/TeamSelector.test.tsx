/**
 * Tests for TeamSelector component
 *
 * TeamSelector allows selecting a team reference with support for all types:
 * - Group-Team: select group + position (e.g., "0_1")
 * - Standing: select standing + group (e.g., "P1 Gruppe 1")
 * - Result: select winner/loser + match (e.g., "Gewinner HF1")
 * - Static: enter custom name (e.g., "Team Officials")
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamSelector from '../TeamSelector';
import type { TeamReference } from '../../types/designer';

describe('TeamSelector', () => {
  const mockOnChange = vi.fn();

  const TestWrapper = ({ 
    initialValue, 
    ...props 
  }: { 
    initialValue: TeamReference; 
    label?: string;
    matchNames?: string[];
    groupNames?: string[];
    availableStages?: Array<{ id: string; name: string }>;
  }) => {
    const [value, setValue] = React.useState(initialValue);
    const handleChange = (newValue: TeamReference) => {
      setValue(newValue);
      mockOnChange(newValue);
    };

    return (
      <TeamSelector
        value={value}
        onChange={handleChange}
        label={props.label || 'Team'}
        matchNames={props.matchNames || ['HF1', 'HF2', 'Spiel 3', 'Finale']}
        groupNames={props.groupNames || ['Gruppe 1', 'Gruppe 2']}
        availableStages={props.availableStages || []}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSelector = (
    value: TeamReference = { type: 'static', name: '' },
    label = 'Team'
  ) => {
    return render(<TestWrapper initialValue={value} label={label} />);
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
  });

  describe('group-team reference', () => {
    it('shows group and team inputs for groupTeam type', () => {
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      expect(screen.getByLabelText(/group/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
    });

    it('calls onChange with new groupTeam reference when group changes', async () => {
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      const groupInput = screen.getByLabelText(/group/i);
      fireEvent.change(groupInput, { target: { value: '2' } });

      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'groupTeam',
        group: 2
      }));
    });

    it('calls onChange with new groupTeam reference when team changes', async () => {
      renderSelector({ type: 'groupTeam', group: 0, team: 1 });

      const teamInput = screen.getByLabelText(/position/i);
      fireEvent.change(teamInput, { target: { value: '3' } });

      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'groupTeam',
        team: 3
      }));
    });
  });

  describe('standing reference', () => {
    it('shows place and group inputs for standing type', () => {
      renderSelector({ type: 'standing', place: 1, groupName: 'Gruppe 1' });

      expect(screen.getByLabelText(/place/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
    });

    it('calls onChange when place or group changes', async () => {
      renderSelector({ type: 'standing', place: 1, groupName: 'Gruppe 1' });

      const placeInput = screen.getByLabelText(/place/i);
      fireEvent.change(placeInput, { target: { value: '2' } });
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ place: 2 }));

      const groupInput = screen.getByLabelText(/group name/i);
      fireEvent.change(groupInput, { target: { value: 'New Group' } });
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ groupName: 'New Group' }));
    });
  });

  describe('winner/loser reference', () => {
    it('calls onChange when match name changes', async () => {
      renderSelector({ type: 'winner', matchName: 'HF1' });

      const matchInput = screen.getByLabelText(/match/i);
      fireEvent.change(matchInput, { target: { value: 'Final' } });

      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'winner',
        matchName: 'Final'
      }));
    });
  });

  describe('rank reference', () => {
    it('shows rank and stage inputs for rank type', () => {
      render(
        <TestWrapper
          initialValue={{ type: 'rank', place: 1, stageId: 's1', stageName: 'Stage 1' }}
          availableStages={[{ id: 's1', name: 'Stage 1' }]}
        />
      );

      expect(screen.getByLabelText(/rank/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stage/i)).toBeInTheDocument();
    });

    it('calls onChange when stage is selected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper
          initialValue={{ type: 'rank', place: 1, stageId: '', stageName: '' }}
          availableStages={[{ id: 's1', name: 'Stage 1' }]}
        />
      );

      const stageSelect = screen.getByLabelText(/stage/i);
      await user.selectOptions(stageSelect, 's1');

      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'rank',
        stageId: 's1',
        stageName: 'Stage 1'
      }));
    });

    it('calls onChange when rank place changes', async () => {
      render(
        <TestWrapper
          initialValue={{ type: 'rank', place: 1, stageId: 's1', stageName: 'Stage 1' }}
          availableStages={[{ id: 's1', name: 'Stage 1' }]}
        />
      );

      const placeInput = screen.getByLabelText(/rank/i);
      fireEvent.change(placeInput, { target: { value: '3' } });

      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'rank',
        place: 3
      }));
    });
  });

  describe('groupRank reference', () => {
    it('calls onChange when groupRank values change', async () => {
      render(
        <TestWrapper
          initialValue={{ type: 'groupRank', place: 1, groupName: 'Group A', stageId: 's1', stageName: 'Stage 1' }}
          groupNames={['Group A']}
          availableStages={[{ id: 's1', name: 'Stage 1' }, { id: 's2', name: 'Stage 2' }]}
        />
      );

      const placeInput = screen.getByLabelText(/rank/i);
      fireEvent.change(placeInput, { target: { value: '2' } });
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ place: 2 }));

      const groupInput = screen.getByLabelText(/group/i);
      fireEvent.change(groupInput, { target: { value: 'Group B' } });
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ groupName: 'Group B' }));

      const stageSelect = screen.getByLabelText(/stage/i);
      fireEvent.change(stageSelect, { target: { value: 's2' } });
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ stageId: 's2', stageName: 'Stage 2' }));
    });
  });

  describe('static reference', () => {
    it('calls onChange when name changes', async () => {
      renderSelector({ type: 'static', name: '' });

      const nameInput = screen.getByLabelText(/team name/i);
      fireEvent.change(nameInput, { target: { value: 'New Team' } });

      expect(mockOnChange).toHaveBeenLastCalledWith({
        type: 'static',
        name: 'New Team'
      });
    });
  });

  describe('type switching', () => {
    it('switches to various types and creates default reference', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper 
          initialValue={{ type: 'static', name: 'Test' }}
          availableStages={[{ id: 's1', name: 'Stage 1' }]}
          groupNames={['Group A']}
        />
      );

      const typeSelect = screen.getByLabelText(/type/i);
      
      await user.selectOptions(typeSelect, 'groupTeam');
      expect(mockOnChange).toHaveBeenLastCalledWith({ type: 'groupTeam', group: 0, team: 0 });

      await user.selectOptions(typeSelect, 'standing');
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'standing', place: 1 }));

      await user.selectOptions(typeSelect, 'winner');
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'winner' }));

      await user.selectOptions(typeSelect, 'loser');
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'loser' }));

      await user.selectOptions(typeSelect, 'rank');
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'rank', stageId: 's1' }));

      await user.selectOptions(typeSelect, 'groupRank');
      expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'groupRank', groupName: 'Group A', stageId: 's1' }));

      await user.selectOptions(typeSelect, 'static');
      expect(mockOnChange).toHaveBeenLastCalledWith({ type: 'static', name: '' });
    });
  });

  describe('label', () => {
    it('displays the provided label', () => {
      renderSelector({ type: 'static', name: '' }, 'Home Team');
      expect(screen.getByText('Home Team')).toBeInTheDocument();
    });
  });
});