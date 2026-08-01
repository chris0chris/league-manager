import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameProgressPage from '../GameProgressPage';
import { useGameProgress } from '../hooks/useGameProgress';

import { GameProgressState } from '../../../types/progressTypes';

vi.mock('../hooks/useGameProgress');
vi.mock('../../../i18n/useTypedTranslation', () => ({
  useTypedTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'ui:gameProgress.section.live') return `Live (${params?.count} Games)`;
      if (key === 'ui:gameProgress.section.today_top') return 'Today';
      if (key === 'ui:gameProgress.section.today_results') return `Results (${params?.count} Gamedays)`;
      if (key === 'ui:gameProgress.section.outlook') return 'Outlook';
      return key;
    },
  }),
}));

// Mock GamedayCard to avoid deep rendering issues in this test
vi.mock('../GamedayCard', () => ({
  default: ({ gameday }: { gameday: { name: string } }) => <div data-testid="gameday-card">{gameday.name}</div>
}));

describe('GameProgressPage', () => {
  const baseState: GameProgressState = {
    loading: false,
    error: null,
    gamedays: [],
    live: [],
    soon: [],
    today: [],
    recent: [],
    upcoming: [],
    totalLiveGames: 0,
    totalPlayedGamesToday: 0,
    todayGamedayCount: 0,
  };

  it('should show "Today" header when gamedays exist but none are live or played', () => {
    vi.mocked(useGameProgress).mockReturnValue({
      ...baseState,
      gamedays: [{ id: 1 }] as unknown as GameProgressState['gamedays'],
      live: [{ id: 1, name: 'Upcoming Today' }] as unknown as GameProgressState['live'],
      refetch: vi.fn(),
    });

    render(<GameProgressPage />);
    expect(screen.getByText('Today')).toBeDefined();
  });

  it('should show "Live" header when games are actually in progress', () => {
    vi.mocked(useGameProgress).mockReturnValue({
      ...baseState,
      gamedays: [{ id: 1 }] as unknown as GameProgressState['gamedays'],
      live: [{ id: 1, name: 'Live Gameday' }] as unknown as GameProgressState['live'],
      totalLiveGames: 3,
      refetch: vi.fn(),
    });

    render(<GameProgressPage />);
    expect(screen.getByText('Live (3 Games)')).toBeDefined();
  });

  it('should show "Results" header when games are finished but none are live', () => {
    vi.mocked(useGameProgress).mockReturnValue({
      ...baseState,
      gamedays: [{ id: 1 }] as unknown as GameProgressState['gamedays'],
      live: [{ id: 1, name: 'Finished Today' }] as unknown as GameProgressState['live'],
      totalPlayedGamesToday: 10,
      refetch: vi.fn(),
    });

    render(<GameProgressPage />);
    expect(screen.getByText('Results (1 Gamedays)')).toBeDefined();
  });
});
