import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentGeneratorModal from '../TournamentGeneratorModal';
import { DEFAULT_START_TIME, DEFAULT_GAME_DURATION } from '../../../utils/tournamentConstants';
import type { GlobalTeam } from '../../../types/flowchart';
import i18n from '../../../i18n/testConfig';

describe('TournamentGeneratorModal - Defaults and Duration', () => {
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

  it('should initialize start time with new default (10:00)', () => {
    render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    const startTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
    expect(startTimeInput.value).toBe(DEFAULT_START_TIME);
    expect(DEFAULT_START_TIME).toBe('10:00');
  });

  it('should display a game duration input initialized with 70', () => {
    render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    const durationInput = screen.getByLabelText(/game duration/i) as HTMLInputElement;
    expect(durationInput.value).toBe(DEFAULT_GAME_DURATION.toString());
    expect(DEFAULT_GAME_DURATION).toBe(70);
  });

  it('should allow changing the game duration', async () => {
    const user = userEvent.setup();
    render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    const durationInput = screen.getByLabelText(/game duration/i) as HTMLInputElement;
    await user.clear(durationInput);
    await user.type(durationInput, '45');
    
    expect(durationInput.value).toBe('45');
  });

  it('should validate duration range (15-180)', async () => {
    const user = userEvent.setup();
    render(
      <TournamentGeneratorModal
        show={true}
        onHide={mockOnHide}
        teams={mockTeams}
        onGenerate={mockOnGenerate}
      />
    );

    const durationInput = screen.getByLabelText(/game duration/i) as HTMLInputElement;
    const generateButton = screen.getByRole('button', { name: /generate/i });

    // Too low
    await user.clear(durationInput);
    await user.type(durationInput, '10');
    await user.click(generateButton);
    expect(mockOnGenerate).not.toHaveBeenCalled();
    expect(screen.getByText(/between 15 and 180/i)).toBeInTheDocument();

    // Too high
    await user.clear(durationInput);
    await user.type(durationInput, '200');
    await user.click(generateButton);
    expect(mockOnGenerate).not.toHaveBeenCalled();
    expect(screen.getByText(/between 15 and 180/i)).toBeInTheDocument();

    // Valid
    await user.clear(durationInput);
    await user.type(durationInput, '60');
    await user.click(generateButton);
    expect(mockOnGenerate).toHaveBeenCalledWith(expect.objectContaining({
      startTime: DEFAULT_START_TIME,
      template: expect.objectContaining({
        timing: expect.objectContaining({
          defaultGameDuration: 60
        })
      })
    }));
  });
});
