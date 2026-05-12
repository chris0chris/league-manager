/**
 * Tests for utils/api.ts
 *
 * TDD RED Phase: Tests for API utility functions
 *
 * Coverage targets:
 * - getGamedayEvents function
 * - Event filtering (gameday_ and template_ prefixes)
 * - Authentication token handling
 * - Error handling for missing auth token
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGamedayEvents } from '../utils/api';

describe('api/getGamedayEvents', () => {
  let originalFetch: typeof fetch;
  let mockFetch: ReturnType<typeof vi.fn>;
  let store: Record<string, string> = {};
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    store = {
      authToken: 'test-token-123',
    };

    global.localStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
      length: Object.keys(store).length,
    } as Storage;

    // Mock fetch
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should throw error when no auth token is found', async () => {
      store = {}; // Clear auth token

      await expect(getGamedayEvents('user123')).rejects.toThrow(
        'No authentication token found'
      );
    });

    it('should include auth token in request headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await getGamedayEvents('user123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Token test-token-123',
          }),
        })
      );
    });
  });

  describe('API Request', () => {
    it('should fetch events from correct endpoint with user_id parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await getGamedayEvents('user123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/journey/events/?user_id=user123',
        expect.any(Object)
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(getGamedayEvents('user123')).rejects.toThrow(
        'Failed to fetch events: Unauthorized'
      );
    });

    it('should include credentials in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await getGamedayEvents('user123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });

  describe('Event Filtering', () => {
    it('should filter only gameday_ and template_ events', async () => {
      const mixedEvents = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'template_saved', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'other_event', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'random_event', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'template_imported', metadata: {}, created_at: '2024-01-06' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mixedEvents }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toHaveLength(4);
      expect(result).toEqual([
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'template_saved', metadata: {}, created_at: '2024-01-02' },
        { id: 4, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-04' },
        { id: 6, event_name: 'template_imported', metadata: {}, created_at: '2024-01-06' },
      ]);
    });

    it('should return empty array when no matching events exist', async () => {
      const events = [
        { id: 1, event_name: 'other_event', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'random_event', metadata: {}, created_at: '2024-01-02' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toHaveLength(0);
    });

    it('should return all events when all are gameday_ or template_', async () => {
      const events = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'template_saved', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toHaveLength(3);
      expect(result).toEqual(events);
    });

    it('should handle empty results from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toEqual([]);
    });

    it('should handle results without results key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toEqual([]);
    });

    it('should correctly identify gameday_ prefix variants', async () => {
      const events = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_deleted', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_imported', metadata: {}, created_at: '2024-01-05' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toHaveLength(5);
    });

    it('should correctly identify template_ prefix variants', async () => {
      const events = [
        { id: 1, event_name: 'template_saved', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'template_imported', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'template_exported', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'template_deleted', metadata: {}, created_at: '2024-01-04' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result).toHaveLength(4);
    });

    it('should not match partial prefixes', async () => {
      const events = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'my_gameday_event', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'template_saved', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'my_template_event', metadata: {}, created_at: '2024-01-04' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      // Only 'gameday_created' and 'template_saved' should match
      expect(result).toHaveLength(2);
      expect(result[0].event_name).toBe('gameday_created');
      expect(result[1].event_name).toBe('template_saved');
    });
  });

  describe('Response Handling', () => {
    it('should preserve event metadata in filtered results', async () => {
      const events = [
        {
          id: 1,
          event_name: 'gameday_created',
          metadata: { name: 'Test Gameday', sport: 'soccer' },
          created_at: '2024-01-01',
        },
        {
          id: 2,
          event_name: 'template_saved',
          metadata: { template_id: 'xyz', version: 1 },
          created_at: '2024-01-02',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result[0].metadata).toEqual({ name: 'Test Gameday', sport: 'soccer' });
      expect(result[1].metadata).toEqual({ template_id: 'xyz', version: 1 });
    });

    it('should preserve timestamps in filtered results', async () => {
      const events = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01T10:00:00Z' },
        { id: 2, event_name: 'template_saved', metadata: {}, created_at: '2024-01-02T15:30:00Z' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: events }),
      });

      const result = await getGamedayEvents('user123');

      expect(result[0].created_at).toBe('2024-01-01T10:00:00Z');
      expect(result[1].created_at).toBe('2024-01-02T15:30:00Z');
    });
  });
});
