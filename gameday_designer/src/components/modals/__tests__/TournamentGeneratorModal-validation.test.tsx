/**
 * Tests for TournamentGeneratorModal validation logic
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentGeneratorModal from '../TournamentGeneratorModal';
import type { GlobalTeam } from '../../../types/flowchart';
import i18n from '../../../i18n/testConfig';

describe('TournamentGeneratorModal - Validation', () => {
  const mockOnHide = vi.fn();
  const mockOnGenerate = vi.fn();
  
  // 6 teams needed for the first template
  const mockTeams: GlobalTeam[] = [
    { id: '1', label: 'Team 1', color: '#000', order: 0, groupId: 'g1' },
    { id: '2', label: 'Team 2', color: '#000', order: 1, groupId: 'g1' },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('should disable generate button when team count is insufficient and generateTeams is false', () => {
    render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams} // Only 2 teams, but 6 needed
        onGenerate={mockOnGenerate}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate/i });
    
    // By default generateTeams is false, so it should be disabled
    expect(generateButton).toBeDisabled();
    
    // Should show a warning message (checking for raw key or translated text)
    const alerts = screen.getAllByRole('alert');
    const warningAlert = alerts.find(a => a.className.includes('alert-warning'));
    expect(warningAlert).toBeDefined();
    // In test environment, it returns the raw key if not loaded, or the translated text if loaded
    expect(warningAlert?.textContent).toMatch(/insufficientTeams|Not enough teams/i);
  });

  it('should enable generate button when team count is insufficient but generateTeams is true', async () => {
    const { user } = renderWithUser(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={[]} // Use empty to allow toggling
        onGenerate={mockOnGenerate}
      />
    );

    const generateTeamsCheckbox = screen.getByLabelText(/automatically/i);
    await user.click(generateTeamsCheckbox);

    const generateButton = screen.getByRole('button', { name: /generate/i });
    expect(generateButton).toBeEnabled();
    
    // Warning should be gone
    const alerts = screen.queryAllByRole('alert');
    const warningAlert = alerts.find(a => a.className.includes('alert-warning'));
    expect(warningAlert).toBeUndefined();
  });
});

// Helper for user events
function renderWithUser(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}
