/**
 * Tests for TournamentGeneratorModal reset behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentGeneratorModal from '../TournamentGeneratorModal';
import type { GlobalTeam } from '../../../types/flowchart';
import i18n from '../../../i18n/testConfig';
import { DEFAULT_START_TIME } from '../../../utils/tournamentConstants';

describe('TournamentGeneratorModal - Reset Behavior', () => {
  const mockOnHide = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockTeams: GlobalTeam[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('should reset its internal state when a tournament is generated', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    // 1. Change the start time
    const startTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '12:00');
    expect(startTimeInput.value).toBe('12:00');

    // 2. Click generate
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    expect(mockOnGenerate).toHaveBeenCalled();
    expect(mockOnHide).toHaveBeenCalled();

    // 3. Re-open the modal
    // Toggle show prop to simulate hide/show without unmounting
    rerender(
      <TournamentGeneratorModal
        show={false}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );
    rerender(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    // 4. Check if start time is reset to default
    const reopenedStartTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
    expect(reopenedStartTimeInput.value).toBe(DEFAULT_START_TIME);
  });
});
