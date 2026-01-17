/**
 * Mock Gameday API Service
 * 
 * Simulates the backend API for gameday management during development.
 * Uses localStorage for persistence.
 */

import type { Gameday, GamedayListEntry, PaginatedResponse } from '../types';
import { matchGameday } from '../utils/searchEngine';

const STORAGE_KEY = 'leaguesphere_gamedays';

const INITIAL_GAMEDAYS: Gameday[] = [
  {
    id: 1,
    name: 'DFFL Gameday 1',
    date: '2026-04-13',
    start: '10:00',
    format: '6_2',
    author: 1,
    author_display: 'Admin',
    address: 'Sportpark Mitte',
    season: 1,
    season_display: 'Season 2026',
    league: 1,
    league_display: 'DFFL',
    designer_data: { fields: [] }
  },
  {
    id: 2,
    name: 'DFFL Gameday 2',
    date: '2026-04-20',
    start: '09:00',
    format: '5_2',
    author: 1,
    author_display: 'Admin',
    address: 'Nordstadion',
    season: 1,
    season_display: 'Season 2026',
    league: 1,
    league_display: 'DFFL',
    designer_data: { fields: [] }
  }
];

class MockGamedayService {
  private gamedays: Gameday[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.gamedays = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored gamedays', e);
        this.gamedays = [...INITIAL_GAMEDAYS];
      }
    } else {
      this.gamedays = [...INITIAL_GAMEDAYS];
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gamedays));
  }

  async list(params?: { search?: string }): Promise<PaginatedResponse<GamedayListEntry>> {
    let filtered = [...this.gamedays];
    
    if (params?.search) {
      filtered = filtered.filter(g => matchGameday(g, params.search!));
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const results: GamedayListEntry[] = filtered.map(g => ({
      ...g,
      status: new Date(g.date) < new Date() ? 'completed' : 'scheduled'
    }));

    return {
      count: results.length,
      next: null,
      previous: null,
      results
    };
  }

  async get(id: number): Promise<Gameday> {
    const gameday = this.gamedays.find(g => g.id === id);
    if (!gameday) throw new Error('Not found');
    return { ...gameday };
  }

  async create(data: Partial<Gameday>): Promise<Gameday> {
    const newId = this.gamedays.length > 0 
      ? Math.max(...this.gamedays.map(g => g.id)) + 1 
      : 1;
    
    const newGameday: Gameday = {
      id: newId,
      name: data.name || 'New Gameday',
      date: data.date || new Date().toISOString().split('T')[0],
      start: data.start || '10:00',
      format: data.format || '6_2',
      author: 1,
      author_display: 'Current User',
      address: data.address || '',
      season: data.season || 1,
      league: data.league || 1,
      designer_data: data.designer_data || { fields: [] }
    };

    this.gamedays.push(newGameday);
    this.saveToStorage();
    return newGameday;
  }

  async update(id: number, data: Partial<Gameday>): Promise<Gameday> {
    const index = this.gamedays.findIndex(g => g.id === id);
    if (index === -1) throw new Error('Not found');

    this.gamedays[index] = {
      ...this.gamedays[index],
      ...data,
      id // Ensure ID doesn't change
    };

    this.saveToStorage();
    return { ...this.gamedays[index] };
  }

  async delete(id: number): Promise<void> {
    this.gamedays = this.gamedays.filter(g => g.id !== id);
    this.saveToStorage();
  }
}

export const mockGamedayService = new MockGamedayService();
