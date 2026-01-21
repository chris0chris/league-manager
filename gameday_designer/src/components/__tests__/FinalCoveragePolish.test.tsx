/**
 * Final coverage polish tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import GamedayMetadataAccordion from '../GamedayMetadataAccordion';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { useDesignerController } from '../../hooks/useDesignerController';
import { gamedayApi } from '../../api/gamedayApi';
import type { GamedayMetadata } from '../../types/flowchart';

vi.mock('../../hooks/useDesignerController');
vi.mock('../../api/gamedayApi');

describe('Final Coverage Polish', () => {
  const mockHandlers = {
    handleUpdateNode: vi.fn(),
    addNotification: vi.fn(),
    handleHighlightElement: vi.fn(),
    handleClearAll: vi.fn(),
    handleSelectNode: vi.fn(),
  };

  const defaultMetadata = { id: 1, name: "Test", status: 'DRAFT', designer_data: {} };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  it('GamedayMetadataAccordion: tests field changes', () => {
    const onUpdate = vi.fn();
    render(
      <GamedayMetadataAccordion 
        metadata={defaultMetadata as unknown as GamedayMetadata} 
        onUpdate={onUpdate}
      />
    );

    // Expand accordion to see fields
    fireEvent.click(screen.getByTestId('gameday-metadata-header').querySelector('button')!);

    // Change Name
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Name' } });
    expect(onUpdate).toHaveBeenCalledWith({ name: 'New Name' });

    // Change Date
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2026-06-01' } });
    expect(onUpdate).toHaveBeenCalledWith({ date: '2026-06-01' });

    // Change Start Time
    fireEvent.change(screen.getByLabelText(/Start Time/i), { target: { value: '11:00' } });
    expect(onUpdate).toHaveBeenCalledWith({ start: '11:00' });

    // Change Venue
    fireEvent.change(screen.getByLabelText(/Venue/i), { target: { value: 'New Field' } });
    expect(onUpdate).toHaveBeenCalledWith({ address: 'New Field' });
  });

  it('ListDesignerApp: handleSaveResult success path', async () => {
    const mockGame = { id: 'game-123', type: 'game', data: {} };
    const mockController = {
        metadata: { ...defaultMetadata, status: 'PUBLISHED' },
        nodes: [mockGame],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: [],
        selectedNode: mockGame,
        validation: { isValid: true, errors: [], warnings: [] },
        notifications: [],
        ui: { hasData: true },
        handlers: mockHandlers,
        updateMetadata: vi.fn(),
        exportState: vi.fn().mockReturnValue({}),
    };
    vi.mocked(useDesignerController).mockReturnValue(mockController as unknown as ReturnType<typeof useDesignerController>);
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({ ...defaultMetadata, status: 'IN_PROGRESS' } as unknown as Awaited<ReturnType<typeof gamedayApi.getGameday>>);
    vi.mocked(gamedayApi.updateGameResult).mockResolvedValue({ 
        halftime_score: { home: 1, away: 0 },
        final_score: { home: 2, away: 1 },
        status: 'COMPLETED'
    } as unknown as Awaited<ReturnType<typeof gamedayApi.updateGameResult>>);

    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );

    // Wait for load
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());

    // Save result
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
        expect(gamedayApi.updateGameResult).toHaveBeenCalled();
        expect(mockHandlers.handleUpdateNode).toHaveBeenCalledWith('game-123', expect.objectContaining({
            status: 'COMPLETED'
        }));
        expect(gamedayApi.getGameday).toHaveBeenCalledWith(1);
        expect(mockController.updateMetadata).toHaveBeenCalled();
    });
  });
});