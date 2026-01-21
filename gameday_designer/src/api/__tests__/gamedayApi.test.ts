/**
 * Tests for Gameday API Client
 *
 * Testing the API client methods for Gameday CRUD operations.
 * Following TDD approach - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  Gameday,
  GamedayListEntry,
  PaginatedResponse,
} from '../../types';

// Use vi.hoisted to create mock before hoisted vi.mock call
const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn((callback: (config: unknown) => unknown) => callback) },
    response: { use: vi.fn((success: (response: unknown) => unknown, error: (error: unknown) => unknown) => ({ success, error })) },
  },
}));

// Mock axios module to always return our mock instance
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    defaults: {
      xsrfCookieName: '',
      xsrfHeaderName: '',
      withCredentials: false
    }
  },
}));

// Import after mocking
import { gamedayApi } from '../gamedayApi';

describe('GamedayApi', () => {
  beforeEach(() => {
    // Clear all mock calls
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();
  });

  describe('listGamedays', () => {
    it('should fetch all gamedays with pagination', async () => {
      const mockResponse: PaginatedResponse<GamedayListEntry> = {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            name: 'Gameday 1',
            date: '2024-04-13',
            start: '10:00',
            format: '6_2',
            author: 1,
            address: 'Main Field',
            season: 1,
            league: 1,
            status: 'draft',
          },
          {
            id: 2,
            name: 'Gameday 2',
            date: '2024-04-20',
            start: '09:00',
            format: '5_2',
            author: 1,
            address: 'Other Field',
            season: 1,
            league: 1,
            status: 'scheduled',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await gamedayApi.listGamedays();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
      expect(result.results).toHaveLength(2);
    });

    it('should fetch gamedays with search filter', async () => {
      const mockResponse: PaginatedResponse<GamedayListEntry> = {
        count: 1,
        next: null,
        previous: null,
        results: [],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await gamedayApi.listGamedays({ search: 'Gameday 1' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: { search: 'Gameday 1' },
      });
    });
  });

  describe('getGameday', () => {
    it('should fetch a single gameday by ID', async () => {
      const mockGameday: Gameday = {
        id: 1,
        name: 'Gameday 1',
        date: '2024-04-13',
        start: '10:00',
        format: '6_2',
        author: 1,
        address: 'Main Field',
        season: 1,
        league: 1,
        designer_data: {
            fields: []
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockGameday });

      const result = await gamedayApi.getGameday(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/1/');
      expect(result).toEqual(mockGameday);
    });
  });

  describe('createGameday', () => {
    it('should create a new gameday', async () => {
      const newGameday = {
        name: 'New Gameday',
        date: '2024-05-01',
        start: '08:00',
        season: 1,
        league: 1,
      };

      const mockResponse: Gameday = {
        id: 3,
        ...newGameday,
        format: '6_2',
        author: 1,
        address: '',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await gamedayApi.createGameday(newGameday);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/', newGameday);
      expect(result.id).toBe(3);
    });
  });

  describe('updateGameday', () => {
    it('should update an existing gameday with PUT', async () => {
      const updatedData = {
        name: 'Updated Gameday',
      };

      const mockResponse: Gameday = {
        id: 1,
        name: 'Updated Gameday',
        date: '2024-04-13',
        start: '10:00',
        format: '6_2',
        author: 1,
        address: 'Main Field',
        season: 1,
        league: 1,
      };

      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await gamedayApi.updateGameday(1, updatedData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/1/', updatedData);
      expect(result.name).toBe('Updated Gameday');
    });
  });

  describe('patchGameday', () => {
    it('should partially update a gameday with PATCH', async () => {
      const patchData = { name: 'Patched Gameday' };

      const mockResponse: Gameday = {
        id: 1,
        name: 'Patched Gameday',
        date: '2024-04-13',
        start: '10:00',
        format: '6_2',
        author: 1,
        address: 'Main Field',
        season: 1,
        league: 1,
      };

      mockAxiosInstance.patch.mockResolvedValue({ data: mockResponse });

      const result = await gamedayApi.patchGameday(1, patchData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/1/', patchData);
      expect(result.name).toBe('Patched Gameday');
    });
  });

  describe('deleteGameday', () => {
    it('should delete a gameday', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await gamedayApi.deleteGameday(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/1/');
    });
  });
});
