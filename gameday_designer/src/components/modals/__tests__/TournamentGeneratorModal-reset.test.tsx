import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentGeneratorModal from '../TournamentGeneratorModal';
import { DEFAULT_START_TIME } from '../../../utils/tournamentConstants';
import { GamedayProvider } from '../../../context/GamedayContext';
import type { GlobalTeam } from '../../../types/flowchart';
import i18n from '../../../i18n/testConfig';

describe('TournamentGeneratorModal - Reset Behavior', () => {
  const mockOnHide = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockTeams: GlobalTeam[] = Array.from({ length: 6 }, (_, i) => ({
    id: `t${i}`,
    label: `Team ${i}`,
    color: '#000',
    order: i,
    groupId: 'g1'
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  const renderModal = (show = true) => {
    return render(
      <GamedayProvider>
        <TournamentGeneratorModal
          show={show}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      </GamedayProvider>
    );
  };

  it('should reset its internal state when a tournament is generated', async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    // 1. Change the start time
    const startTimeInput = screen.getByLabelText(/label.startTime/i) as HTMLInputElement;
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '12:00');
    expect(startTimeInput.value).toBe('12:00');

    // 2. Generate
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);
    expect(mockOnGenerate).toHaveBeenCalled();

    // 3. Close and Reopen (simulate real app behavior)
    rerender(
      <GamedayProvider>
        <TournamentGeneratorModal
          show={false}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      </GamedayProvider>
    );
    rerender(
      <GamedayProvider>
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      </GamedayProvider>
    );

    // 4. Verify start time is reset to default
    const startTimeInputAfter = screen.getByLabelText(/label.startTime/i) as HTMLInputElement;
    expect(startTimeInputAfter.value).toBe(DEFAULT_START_TIME);
  });
});