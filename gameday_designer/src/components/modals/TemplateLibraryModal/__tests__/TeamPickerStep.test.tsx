import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TeamPickerStep from '../TeamPickerStep';
import React from 'react';
import { designerApi } from '../../../../api/designerApi';

// Mock designerApi
vi.mock('../../../../api/designerApi', () => ({
  designerApi: {
    getConfig: vi.fn(),
    getLeagueTeams: vi.fn(),
  },
}));

const mockTeams = [
  { id: '1', label: 'Team A', groupId: null, order: 0 },
  { id: '2', label: 'Team B', groupId: null, order: 1 },
  { id: '3', label: 'Team C', groupId: null, order: 2 },
];

describe('TeamPickerStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(designerApi.getConfig).mockResolvedValue({ mock_teams: true });
  });

  it('shows required team count', () => {
    render(<TeamPickerStep requiredTeams={6} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} />);
    // There are two "6"s: one in <strong> and one in <Badge>
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
  });

  it('starts with no teams selected', () => {
    render(<TeamPickerStep requiredTeams={2} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} />);
    // Check that no teams are selected initially
    const teamButtons = screen.getAllByText(/^Team [A-C]$/);
    const selectedButtons = teamButtons.filter(b => b.closest('button')?.classList.contains('btn-primary'));
    expect(selectedButtons.length).toBe(0);
  });

  it('toggles selection and disables/enables Apply button', () => {
    // Start with 2 required, 3 available -> Apply initially disabled
    render(<TeamPickerStep requiredTeams={2} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} />);
    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeDisabled();

    // Select Team A
    fireEvent.click(screen.getByText('Team A'));
    expect(applyButton).toBeDisabled(); // Still 1 < 2

    // Select Team B
    fireEvent.click(screen.getByText('Team B'));
    expect(applyButton).not.toBeDisabled(); // Now 2 >= 2

    // Deselect Team A
    fireEvent.click(screen.getByText('Team A'));
    expect(applyButton).toBeDisabled(); // Back to 1 < 2
  });

  it('calls onConfirm with selected team objects', () => {
    const onConfirm = vi.fn();
    render(<TeamPickerStep requiredTeams={2} availableTeams={mockTeams} onConfirm={onConfirm} onBack={vi.fn()} />);

    // Select first two teams
    fireEvent.click(screen.getByText('Team A'));
    fireEvent.click(screen.getByText('Team B'));

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(onConfirm).toHaveBeenCalledWith([
      mockTeams[0],
      mockTeams[1],
    ]);
  });

  it('handles auto-generation of teams', async () => {
    const mockGenerated = [
      { id: 'gen-1', label: 'New Team 1', groupId: null, order: 3 },
    ];
    const onAutoGenerate = vi.fn().mockResolvedValue(mockGenerated);

    render(<TeamPickerStep requiredTeams={4} availableTeams={mockTeams} onConfirm={vi.fn()} onBack={vi.fn()} onAutoGenerateTeams={onAutoGenerate} />);

    // Select 3 teams first
    fireEvent.click(screen.getByText('Team A'));
    fireEvent.click(screen.getByText('Team B'));
    fireEvent.click(screen.getByText('Team C'));

    // Now the button should show "auto-generate 1 missing teams"
    const genButton = await screen.findByText(/auto-generate 1 missing teams/i);
    fireEvent.click(genButton);

    await waitFor(() => {
      expect(onAutoGenerate).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/New Team 1/)).toBeInTheDocument();
    });

    // Check that 4 teams are now selected (3 manual + 1 generated)
    const selectedButtons = screen.getAllByText(/^(Team [A-C]|New Team 1)$/).filter(b => b.closest('button')?.classList.contains('btn-primary'));
    expect(selectedButtons.length).toBe(4);
  });
});
