/**
 * Tests for api/progressApi.ts
 *
 * Regression: the endpoint is paginated, and the client previously returned
 * only `data.results` from the first page. When the progress window held more
 * than one page of gamedays, today's games (beyond the page boundary) were
 * silently dropped. The client must now walk every `next` page.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { progressApi } from '../progressApi';
import type { GamedayProgress } from '../../types/progressTypes';

function makeGameday(id: number): GamedayProgress {
  return {
    id,
    name: `GD ${id}`,
    date: '2026-06-27',
    start: '10:00:00',
    status: '',
    league: 1,
    league_display: 'L',
    season: 1,
    season_display: '2026',
    games: [],
  };
}

describe('progressApi.list', () => {
  let originalFetch: typeof fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = window.fetch;
    mockFetch = vi.fn();
    window.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('returns results from a single page when there is no next page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [makeGameday(1), makeGameday(2)], next: null }),
    });

    const result = await progressApi.list();

    expect(result.map((g) => g.id)).toEqual([1, 2]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('follows next pages and concatenates all results', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [makeGameday(1), makeGameday(2)],
          next: 'https://leaguesphere.app/api/game-progress/?page=2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [makeGameday(3), makeGameday(4)],
          next: 'https://leaguesphere.app/api/game-progress/?page=3',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [makeGameday(5)], next: null }),
      });

    const result = await progressApi.list();

    expect(result.map((g) => g.id)).toEqual([1, 2, 3, 4, 5]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Page 2+ must be fetched same-origin: the server `next` path is re-based
    // onto the current page origin (not the raw absolute URL the server sent).
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${window.location.origin}/api/game-progress/?page=2`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('re-bases an insecure http next URL onto the (https) page origin', async () => {
    // Regression: behind a TLS-terminating proxy DRF can emit an http:// `next`
    // URL. Following it verbatim from an https page is blocked as mixed content
    // ("Failed to fetch"). The client must re-base it onto the page origin.
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [makeGameday(1)],
          // Insecure scheme + (potentially) different host as reported by proxy.
          next: 'http://leaguesphere.app/api/game-progress/?page=2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [makeGameday(2)], next: null }),
      });

    const result = await progressApi.list();

    expect(result.map((g) => g.id)).toEqual([1, 2]);
    const secondCallUrl = mockFetch.mock.calls[1][0] as string;
    // Must be fetched from the page origin, never the cross-origin URL the
    // proxy reported (compare the parsed host, not a URL substring).
    expect(secondCallUrl).toBe(`${window.location.origin}/api/game-progress/?page=2`);
    expect(new URL(secondCallUrl).host).toBe(window.location.host);
  });

  it('handles a non-paginated array response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeGameday(1)],
    });

    const result = await progressApi.list();

    expect(result.map((g) => g.id)).toEqual([1]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws on a failed response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Server Error' });

    await expect(progressApi.list()).rejects.toThrow(
      'Failed to fetch game progress: Server Error',
    );
  });

  it('passes league and season filters as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], next: null }),
    });

    await progressApi.list({ league: 'NRW', season: '2026' });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('league=NRW');
    expect(calledUrl).toContain('season=2026');
  });
});
