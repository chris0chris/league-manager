/**
 * Additional coverage tests for GamedayDashboard
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GamedayDashboard from '../GamedayDashboard';
import { GamedayProvider } from '../../../context/GamedayContext';
import i18n from '../../../i18n/testConfig';
import { gamedayApi } from '../../../api/gamedayApi';
import type { GamedayListEntry, PaginatedResponse } from '../../../types';

// Mock dependencies
vi.mock('../../../api/gamedayApi', () => ({
  gamedayApi: {
    listGamedays: vi.fn(),
    createGameday: vi.fn(),
    deleteGameday: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
const mockLocation = { state: null as unknown, pathname: '/' };
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('GamedayDashboard Coverage', () => {
  const mockGamedays: GamedayListEntry[] = [
    {
      id: 2,
      name: 'Gameday 2',
      date: '2026-04-20',
      start: '09:00',
      format: '5_2',
      author: 1,
      address: 'Field 2',
      season: 1,
      league: 1,
      status: 'DRAFT',
    },
  ];

  const mockResponse: PaginatedResponse<GamedayListEntry> = {
    count: 1,
    next: null,
    previous: null,
    results: mockGamedays,
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.useRealTimers();
    (gamedayApi.listGamedays as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    (gamedayApi.deleteGameday as ReturnType<typeof vi.fn>).mockResolvedValue({});
    mockLocation.state = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDashboard = async (expectSuccess = true) => {
    render(
      <MemoryRouter>
        <GamedayProvider>
          <GamedayDashboard />
        </GamedayProvider>
      </MemoryRouter>
    );
    if (expectSuccess) {
        await waitFor(() => expect(screen.getByText('Gameday 2')).toBeInTheDocument());
    } else {
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    }
  };

  it('handles load gamedays failure', async () => {
    (gamedayApi.listGamedays as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));
    
    await renderDashboard(false);
    
    await waitFor(() => {
        expect(screen.getByText(/failed to load gamedays/i)).toBeInTheDocument();
    });
  });

  it('handles create gameday failure', async () => {
    (gamedayApi.createGameday as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));
    
    await renderDashboard();
    
    const createBtn = screen.getByRole('button', { name: /Create Gameday/i });
    fireEvent.click(createBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to create gameday/i)).toBeInTheDocument();
    });
  });

  it('handles permanent deletion failure and restores item', async () => {
    await renderDashboard();
    
    vi.useFakeTimers();
    (gamedayApi.deleteGameday as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete Error'));
    
    const deleteBtn = screen.getByTitle(/delete gameday/i);
    fireEvent.click(deleteBtn);
    
    // Should show placeholder
    expect(screen.queryByText('Gameday 2')).not.toBeInTheDocument();
    
    // Advance timers
    await act(async () => {
        vi.advanceTimersByTime(10001);
    });

    // Handle the async call triggered by timeout
    // We need to wait for the promise to settle
    await act(async () => {
        await Promise.resolve(); // flush microtasks
        await Promise.resolve();
    });
    
    expect(gamedayApi.deleteGameday).toHaveBeenCalledWith(2);

    // Error message and restore should happen
    expect(screen.getByText(/failed to delete gameday permanently/i)).toBeInTheDocument();
    expect(screen.getByText('Gameday 2')).toBeInTheDocument();
  });

  it('allows undoing a deletion', async () => {
    await renderDashboard();
    
    vi.useFakeTimers();
    
    const deleteBtn = screen.getByTitle(/delete gameday/i);
    fireEvent.click(deleteBtn);
    
    // Hover over placeholder to see undo button
    const card = screen.getByRole('progressbar').closest('.card');
    fireEvent.mouseEnter(card!);
    
    const undoBtn = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoBtn);
    
    // Should NOT call API
    expect(gamedayApi.deleteGameday).not.toHaveBeenCalled();
    
    // Should be restored
    expect(screen.getByText('Gameday 2')).toBeInTheDocument();
  });

  it('handles pendingDeleteId from location state', async () => {
    mockLocation.state = { pendingDeleteId: 2 };
    
    await renderDashboard();
    
    // Should have triggered handleDelete immediately
    // Gameday 2 should be in placeholder mode
    await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.queryByText('Gameday 2')).not.toBeInTheDocument();
    });
    
    // Should have cleared location state via navigate
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true, state: {} });
  });

  it('GamedayDeletePlaceholder updates progress bar', async () => {
    await renderDashboard();
    
    vi.useFakeTimers();
    
    const deleteBtn = screen.getByTitle(/delete gameday/i);
    fireEvent.click(deleteBtn);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    
    act(() => {
        vi.advanceTimersByTime(5000); 
    });
    
    // Progress should have decreased
    expect(parseInt(progressBar.getAttribute('aria-valuenow')!)).toBeLessThan(100);

    act(() => {
        vi.advanceTimersByTime(5001); 
    });
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });
});
