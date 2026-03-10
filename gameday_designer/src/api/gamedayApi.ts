/**
 * Gameday API Client
 *
 * API client for communicating with the Gameday management backend.
 * Provides methods for CRUD operations on Gameday objects.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Gameday,
  GamedayListEntry,
  PaginatedResponse,
  Season,
  League,
} from '../types';
import { mockGamedayService } from './mockGamedayApi';

// Set global defaults for CSRF handling
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

/**
 * API client class for Gameday management operations.
 */
class GamedayApi {
  private client: AxiosInstance;
  private isDev = import.meta.env.DEV;

  constructor(private forceClient = false) {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      // Redundant but safe
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFToken',
      withCredentials: true,
    });

    // Add auth token if available
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    });

    // Error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/accounts/login/';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * List all gamedays with optional filters.
   *
   * @param params - Optional filter parameters
   * @param params.search - Search query for gameday name, teams, etc.
   * @returns Paginated list of gameday entries
   */
  async listGamedays(params?: {
    search?: string;
  }): Promise<PaginatedResponse<GamedayListEntry>> {
    if (this.isDev && !this.forceClient) return mockGamedayService.list(params);
    const response = await this.client.get<PaginatedResponse<GamedayListEntry>>(
      '/gamedays/',
      { params }
    );
    return response.data;
  }

  /**
   * Get a single gameday by ID.
   *
   * @param id - Gameday ID
   * @returns Gameday with all metadata and designer data
   */
  async getGameday(id: number): Promise<Gameday> {
    if (this.isDev && !this.forceClient) return mockGamedayService.get(id);
    const response = await this.client.get<Gameday>(
      `/gamedays/${id}/`
    );
    return response.data;
  }

  /**
   * Create a new gameday.
   *
   * @param data - Gameday data
   * @returns Created gameday
   */
  async createGameday(
    data: Partial<Gameday>
  ): Promise<Gameday> {
    if (this.isDev && !this.forceClient) return mockGamedayService.create(data);
    const response = await this.client.post<Gameday>(
      '/gamedays/',
      data
    );
    return response.data;
  }

  /**
   * Update an existing gameday (full update with PUT).
   *
   * @param id - Gameday ID
   * @param data - Updated gameday data
   * @returns Updated gameday
   */
  async updateGameday(
    id: number,
    data: Partial<Gameday>
  ): Promise<Gameday> {
    if (this.isDev && !this.forceClient) return mockGamedayService.update(id, data);
    const response = await this.client.put<Gameday>(
      `/gamedays/${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Partially update a gameday (PATCH).
   *
   * @param id - Gameday ID
   * @param data - Fields to update
   * @returns Updated gameday
   */
  async patchGameday(
    id: number,
    data: Partial<Gameday>
  ): Promise<Gameday> {
    if (this.isDev && !this.forceClient) return mockGamedayService.update(id, data);
    const response = await this.client.patch<Gameday>(
      `/gamedays/${id}/`,
      data
    );
    return response.data;
  }

  /**
   * List all available seasons.
   */
  async listSeasons(): Promise<Season[]> {
    if (this.isDev && !this.forceClient) return [
      { id: 1, name: '2026 Season' },
      { id: 2, name: '2025 Season' }
    ];
    const response = await this.client.get<Season[]>('/seasons/');
    return response.data;
  }

  /**
   * List all available leagues.
   */
  async listLeagues(): Promise<League[]> {
    if (this.isDev && !this.forceClient) return [
      { id: 1, name: 'DFFL' },
      { id: 2, name: 'DFFL2' }
    ];
    const response = await this.client.get<League[]>('/leagues/');
    return response.data;
  }

  /**
   * Delete a gameday.
   *
   * @param id - Gameday ID
   */
  async deleteGameday(id: number): Promise<void> {
    if (this.isDev && !this.forceClient) return mockGamedayService.delete(id);
    await this.client.delete(`/gamedays/${id}/`);
  }

  /**
   * Publish a gameday.
   *
   * @param id - Gameday ID
   */
  async publish(id: number): Promise<Gameday> {
    if (this.isDev && !this.forceClient) return mockGamedayService.update(id, { status: 'PUBLISHED' });
    const response = await this.client.post<Gameday>(`/gamedays/${id}/publish/`);
    return response.data;
  }

  /**
   * Update game result.
   */
  async updateGameResult(gameId: number, data: { halftime_score: { home: number; away: number }; final_score: { home: number; away: number } }): Promise<unknown> {
    // In dev we just return the data since we don't have a mock for this yet
    if (this.isDev && !this.forceClient) return { ...data, status: data.final_score ? 'COMPLETED' : 'IN_PROGRESS' };
    const response = await this.client.patch(`/gamedays/gameinfo/${gameId}/result/`, data);
    return response.data;
  }

  /**
   * Get all games for a gameday.
   */
  async getGamedayGames(gamedayId: number): Promise<import('../types/designer').GameResultsDisplay[]> {
    if (this.isDev && !this.forceClient) return [];
    const response = await this.client.get<import('../types/designer').GameResultsDisplay[]>(
      `/gamedays/${gamedayId}/games/`
    );
    return response.data;
  }

  /**
   * Update bulk game results for a gameday.
   */
  async updateBulkGameResults(gamedayId: number, gameId: number, results: unknown[]): Promise<void> {
    if (this.isDev && !this.forceClient) return;
    await this.client.post(
      `/gamedays/${gamedayId}/games/${gameId}/results/`,
      { results }
    );
  }

  /**
   * Search for teams in the database pool using DAL endpoint.
   */
  async searchTeams(query: string): Promise<{ id: number; text: string }[]> {
    if (this.isDev && !this.forceClient) {
      const mockTeams = [
        { id: 101, text: 'Augsburg Lions' },
        { id: 102, text: 'Munich Cowboys' },
        { id: 103, text: 'Berlin Adler' },
        { id: 104, text: 'Hamburg Sea Devils' },
        { id: 105, text: 'Frankfurt Galaxy' },
      ];
      return mockTeams.filter(t => t.text.toLowerCase().includes(query.toLowerCase()));
    }
    const response = await this.client.get<{ results: { id: number; text: string }[] }>(
      '/dal/team/',
      { params: { q: query }, baseURL: '' } // Clear baseURL to use absolute path from root
    );
    return response.data.results;
  }
}

/**
 * Singleton instance of the Gameday API client.
 */
export const gamedayApi = new GamedayApi(typeof process !== 'undefined' && process.env.NODE_ENV === 'test');