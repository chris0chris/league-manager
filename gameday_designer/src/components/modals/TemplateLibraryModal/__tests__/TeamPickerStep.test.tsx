import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TeamPickerStep from '../TeamPickerStep';

const mockTeams = [
  { id: '1', label: 'Team A', groupId: null, order: 0 },
  { id: '2', label: 'Team B', groupId: null, order: 1 },
  { id: '3', label: 'Team C', groupId: null, order: 2 },
];

describe('TeamPickerStep', () => {
  it('shows required team count', () => {
    render(<TeamPickerStep show requiredTeams={6} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/6 required/i)).toBeInTheDocument();
  });

  it('disables Confirm when fewer than requiredTeams are selected', () => {
    render(<TeamPickerStep show requiredTeams={3} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    fireEvent.click(screen.getByText('Team A'));
    fireEvent.click(screen.getByText('Team B'));
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    fireEvent.click(screen.getByText('Team C'));
    expect(screen.getByRole('button', { name: /apply/i })).not.toBeDisabled();
  });
});
