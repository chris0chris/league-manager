import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTourSeen } from '../useTourSeen';

describe('useTourSeen', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts loading and requests the completed/skipped events for the tour', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useTourSeen('manual_build'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seen).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      '/api/journey/events/?event_name__in=gd_tour_manual_build_completed,gd_tour_manual_build_skipped',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('returns seen=true when a matching event already exists', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, event_name: 'gd_tour_manual_build_completed', metadata: {}, created_at: '2026-07-19T00:00:00Z' }],
    });

    const { result } = renderHook(() => useTourSeen('manual_build'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seen).toBe(true);
  });

  it('treats a failed request as not-seen', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => [] });

    const { result } = renderHook(() => useTourSeen('save_template'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seen).toBe(false);
  });

  it('markSeen flips seen to true immediately without a refetch', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useTourSeen('manual_build'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.seen).toBe(false);

    act(() => result.current.markSeen());
    expect(result.current.seen).toBe(true);
  });
});
