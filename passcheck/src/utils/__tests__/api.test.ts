import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { apiGet, apiPut } from '../api';

vi.mock('axios');

describe('api utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as Window & typeof globalThis & { location: unknown }).location;
    (window as Window & typeof globalThis & { location: { href: string } }).location = { href: '' };
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiPut', () => {
    it('makes a PUT request with authorization token', async () => {
      localStorage.setItem('token', 'test-token');
      vi.mocked(axios.put).mockResolvedValue({ data: {} });

      await apiPut('/test-url', { data: 'test' });

      expect(axios.put).toHaveBeenCalledWith(
        '/test-url',
        { data: 'test' },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Token test-token',
          },
        }
      );
    });

    it('makes a PUT request without token when not available', async () => {
      vi.mocked(axios.put).mockResolvedValue({ data: {} });

      await apiPut('/test-url', { data: 'test' });

      expect(axios.put).toHaveBeenCalledWith(
        '/test-url',
        { data: 'test' },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('throws ApiError on failure', async () => {
      const error = new Error('Network error') as AxiosError;
      error.message = 'Network error';
      vi.mocked(axios.put).mockRejectedValue(error);

      await expect(apiPut('/test-url', {})).rejects.toMatchObject({
        message: 'Network error',
      });
    });

    it('throws ApiError with detail from response data', async () => {
      const error = {
        message: 'Request failed',
        response: {
          data: { detail: 'Detailed error message' },
        },
      } as AxiosError;
      vi.mocked(axios.put).mockRejectedValue(error);

      await expect(apiPut('/test-url', {})).rejects.toMatchObject({
        message: 'Detailed error message',
      });
    });
  });

  describe('apiGet', () => {
    it('makes a GET request with authorization token', async () => {
      localStorage.setItem('token', 'test-token');
      vi.mocked(axios.get).mockResolvedValue({ data: { result: 'success' } });

      const result = await apiGet('/test-url');

      expect(axios.get).toHaveBeenCalledWith('/test-url', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token test-token',
        },
      });
      expect(result).toEqual({ result: 'success' });
    });

    it('makes a GET request without token when not available', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { result: 'success' } });

      await apiGet('/test-url');

      expect(axios.get).toHaveBeenCalledWith('/test-url', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('handles 401 error in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as AxiosError;
      vi.mocked(axios.get).mockRejectedValue(error);

      await apiGet('/test-url');

      expect(window.location.href).toBe('/scorecard/');
      process.env.NODE_ENV = originalEnv;
    });

    it('shows alert in development mode for 401 error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      localStorage.setItem('token', 'dev-token');

      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as AxiosError;
      vi.mocked(axios.get).mockRejectedValue(error);

      await expect(apiGet('/test-url')).rejects.toMatchObject({
        message: 'Bitte erst anmelden.',
      });
      expect(window.alert).toHaveBeenCalledWith(
        "localStorage.setItem('token', 'dev-token')"
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('throws ApiError for non-401 errors', async () => {
      const error = {
        response: { status: 500 },
        message: 'Server error',
      } as AxiosError;
      vi.mocked(axios.get).mockRejectedValue(error);

      await expect(apiGet('/test-url')).rejects.toMatchObject({
        message: 'Server error',
      });
    });

    it('throws ApiError with detail from response data for non-401 errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: 'Bad request details' },
        },
        message: 'Bad request',
      } as AxiosError;
      vi.mocked(axios.get).mockRejectedValue(error);

      await expect(apiGet('/test-url')).rejects.toMatchObject({
        message: 'Bad request details',
      });
    });
  });
});
