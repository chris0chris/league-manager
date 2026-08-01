import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GamedayDashboard from '../GamedayDashboard';
import { GamedayProvider, useGamedayContext } from '../../../context/GamedayContext';
import i18n from '../../../i18n/testConfig';
import { gamedayApi } from '../../../api/gamedayApi';
import type { GamedayListEntry, PaginatedResponse, Gameday } from '../../../types';
import type { Step } from 'react-joyride';

vi.mock('../../../api/gamedayApi', () => ({
  gamedayApi: {
    listGamedays: vi.fn(),
    createGameday: vi.fn(),
    deleteGameday: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([]),
    listLeagues: vi.fn().mockResolvedValue([]),
    getGameday: vi.fn(),
  },
}));

vi.mock('../../../trackEvent', () => ({
  trackEvent: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/' }),
  };
});

const capturedTourProps: { steps?: Step[]; requireRealAction?: boolean; onFinish?: () => void; run?: boolean } = {};
vi.mock('../../../onboarding/DesignerTour', () => ({
  default: (props: { steps: Step[]; requireRealAction?: boolean; onFinish: () => void; run: boolean }) => {
    Object.assign(capturedTourProps, props);
    return null;
  },
}));

const RESUME_KEY = 'gd_tour_manual_build_gameday_id';

const emptyResponse: PaginatedResponse<GamedayListEntry> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const ReplayTrigger = () => {
  const { replayTourA } = useGamedayContext();
  return replayTourA ? (
    <button data-testid="test-replay-trigger" onClick={replayTourA}>
      replay
    </button>
  ) : null;
};

const draftGameday: Gameday = {
  id: 42,
  name: 'Resumable Gameday',
  date: '2026-07-20',
  start: '10:00',
  format: '6_2',
  author: 1,
  address: '',
  season: 1,
  league: 1,
  status: 'DRAFT',
};

describe('GamedayDashboard tour', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    localStorage.clear();
    for (const key of Object.keys(capturedTourProps)) delete (capturedTourProps as Record<string, unknown>)[key];
    (gamedayApi.listGamedays as ReturnType<typeof vi.fn>).mockResolvedValue(emptyResponse);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderDashboard = async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GamedayProvider>
          <ReplayTrigger />
          <GamedayDashboard />
        </GamedayProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  };

  it('navigates straight to the designer when a valid draft resume id is stored', async () => {
    localStorage.setItem(RESUME_KEY, '42');
    (gamedayApi.getGameday as ReturnType<typeof vi.fn>).mockResolvedValue(draftGameday);

    await renderDashboard();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/designer/42'));
  });

  it('clears the resume id when the stored gameday is no longer a draft', async () => {
    localStorage.setItem(RESUME_KEY, '42');
    (gamedayApi.getGameday as ReturnType<typeof vi.fn>).mockResolvedValue({ ...draftGameday, status: 'PUBLISHED' });

    await renderDashboard();

    await waitFor(() => expect(gamedayApi.getGameday).toHaveBeenCalledWith(42));
    expect(mockNavigate).not.toHaveBeenCalledWith('/designer/42');
    expect(localStorage.getItem(RESUME_KEY)).toBeNull();
  });

  it('clears the resume id when the stored gameday no longer exists', async () => {
    localStorage.setItem(RESUME_KEY, '42');
    (gamedayApi.getGameday as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404'));

    await renderDashboard();

    await waitFor(() => expect(localStorage.getItem(RESUME_KEY)).toBeNull());
    expect(mockNavigate).not.toHaveBeenCalledWith('/designer/42');
  });

  it('does not call getGameday when no resume id is stored', async () => {
    await renderDashboard();
    await waitFor(() => expect(gamedayApi.listGamedays).toHaveBeenCalled());
    expect(gamedayApi.getGameday).not.toHaveBeenCalled();
  });

  it('adds a testid to the header Create Gameday button', async () => {
    await renderDashboard();
    expect(screen.getByTestId('create-gameday-button')).toBeInTheDocument();
  });

  it('runs the create-step tour, pointed at the Create Gameday button, when unseen and nothing to resume', async () => {
    await renderDashboard();
    await waitFor(() => expect(capturedTourProps.run).toBe(true));
    expect(capturedTourProps.requireRealAction).toBe(true);
    expect(capturedTourProps.steps?.[0]).toMatchObject({ target: '[data-testid="create-gameday-button"]' });
  });

  it('stores the resume id when a gameday is created while the create-step tour is active', async () => {
    (gamedayApi.createGameday as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 7, name: 'x' });
    (gamedayApi.listSeasons as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    (gamedayApi.listLeagues as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);

    await renderDashboard();
    await waitFor(() => expect(capturedTourProps.run).toBe(true));

    fireEvent.click(screen.getByTestId('create-gameday-button'));

    await waitFor(() => expect(localStorage.getItem(RESUME_KEY)).toBe('7'));
  });

  it('does not store a resume id when creating a gameday after the tour is already seen', async () => {
    vi.mocked(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, event_name: 'gd_tour_manual_build_completed', metadata: {}, created_at: '2026-07-19T00:00:00Z' }],
    });
    (gamedayApi.createGameday as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 8, name: 'x' });
    (gamedayApi.listSeasons as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    (gamedayApi.listLeagues as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);

    await renderDashboard();
    await waitFor(() => expect(capturedTourProps.run).toBe(false));

    fireEvent.click(screen.getByTestId('create-gameday-button'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/designer/8'));
    expect(localStorage.getItem(RESUME_KEY)).toBeNull();
  });

  it('hides the create-step tour once it is marked seen via onFinish (skip)', async () => {
    await renderDashboard();
    await waitFor(() => expect(capturedTourProps.run).toBe(true));

    act(() => {
      capturedTourProps.onFinish?.();
    });

    await waitFor(() => expect(capturedTourProps.run).toBe(false));
  });

  describe('manual replay', () => {
    const seenFetchResponse = {
      ok: true,
      json: async () => [{ id: 1, event_name: 'gd_tour_manual_build_completed', metadata: {}, created_at: '2026-07-19T00:00:00Z' }],
    };

    it('exposes a replay handler via context', async () => {
      await renderDashboard();
      expect(screen.getByTestId('test-replay-trigger')).toBeInTheDocument();
    });

    it('force-shows the create-step tour on replay even after it was already seen', async () => {
      vi.mocked(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(seenFetchResponse);

      await renderDashboard();
      await waitFor(() => expect(capturedTourProps.run).toBe(false));

      fireEvent.click(screen.getByTestId('test-replay-trigger'));

      await waitFor(() => expect(capturedTourProps.run).toBe(true));
    });

    it('tracks gd_tour_manual_build_started with replay: true', async () => {
      const { trackEvent } = await import('../../../trackEvent');
      vi.mocked(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(seenFetchResponse);

      await renderDashboard();
      await waitFor(() => expect(capturedTourProps.run).toBe(false));

      fireEvent.click(screen.getByTestId('test-replay-trigger'));

      await waitFor(() =>
        expect(trackEvent).toHaveBeenCalledWith('gd_tour_manual_build_started', { replay: true })
      );
    });
  });
});
