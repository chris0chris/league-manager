/**
 * Coverage tests for Gameday API Client Interceptors and Edge Cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';

// Use vi.hoisted to create mock before hoisted vi.mock call
const mockAxiosInstance = vi.hoisted(() => {
  let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  let responseInterceptor: { success: (response: unknown) => unknown; error: (error: unknown) => unknown };

  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { 
        use: vi.fn((callback: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig) => {
          requestInterceptor = callback;
        }),
        getInterceptor: () => requestInterceptor
      },
      response: { 
        use: vi.fn((success: (response: unknown) => unknown, error: (error: unknown) => unknown) => {
          responseInterceptor = { success, error };
        }),
        getInterceptor: () => responseInterceptor
      },
    },
  };
});

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

describe('GamedayApi Interceptors and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('request interceptor should add Authorization header if token exists', async () => {
    localStorage.setItem('authToken', 'test-token');
    const interceptor = mockAxiosInstance.interceptors.request.getInterceptor();
    
    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    const result = interceptor(config);
    
    expect(result.headers.Authorization).toBe('Token test-token');
  });

  it('request interceptor should NOT add Authorization header if token does not exist', async () => {
    const interceptor = mockAxiosInstance.interceptors.request.getInterceptor();
    
    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    const result = interceptor(config);
    
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('response interceptor should handle 401 error', async () => {
    // Mock window.location.href
    const originalLocation = window.location;
    // @ts-expect-error - overriding window.location for test
    delete window.location;
    window.location = { ...originalLocation, href: '' };

    const interceptor = mockAxiosInstance.interceptors.response.getInterceptor();
    const error = {
      response: { status: 401 }
    };

    try {
      await interceptor.error(error);
    } catch {
      // Expected rejection
    }

    expect(window.location.href).toBe('/accounts/login/');
    
    // Restore window.location
    window.location = originalLocation;
  });

  it('updateGameResult should call PATCH /gameinfo/:id/result/', async () => {
    const mockData = {
      halftime_score: { home: 12, away: 6 },
      final_score: { home: 24, away: 12 }
    };
    mockAxiosInstance.patch.mockResolvedValue({ data: { status: 'COMPLETED' } });

    const result = await gamedayApi.updateGameResult(123, mockData);

    expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/gameinfo/123/result/', mockData);
    expect(result).toEqual({ status: 'COMPLETED' });
  });
});