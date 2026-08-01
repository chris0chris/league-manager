/**
 * Tests for GamedayMetadataAccordion Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import GamedayMetadataAccordion from '../GamedayMetadataAccordion';
import type { GamedayMetadata } from '../../types';
import type { FlowValidationResult } from '../../types/flowchart';
import { gamedayApi } from '../../api/gamedayApi';
import '../../i18n/testConfig';

vi.mock('../../api/gamedayApi');

describe('GamedayMetadataAccordion', () => {
  const mockMetadata: GamedayMetadata = {
    id: 1,
    name: 'Test Gameday',
    date: '2026-05-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'Test Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
  };

  const mockOnUpdate = vi.fn();

  const mockValidation: FlowValidationResult = { isValid: true, errors: [], warnings: [] };

  async function renderAccordion(extraProps: Partial<React.ComponentProps<typeof GamedayMetadataAccordion>> = {}) {
    vi.mocked(gamedayApi.listSeasons).mockResolvedValue([]);
    vi.mocked(gamedayApi.listLeagues).mockResolvedValue([]);
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata,
      resource_urls: extraProps.metadata?.resource_urls ?? [],
    } as never);

    const result = render(
      <GamedayMetadataAccordion
        metadata={mockMetadata}
        onUpdate={vi.fn()}
        onClearAll={vi.fn()}
        onDelete={vi.fn()}
        onPublish={vi.fn()}
        onUnlock={vi.fn()}
        onHighlight={vi.fn()}
        validation={mockValidation}
        readOnly={false}
        hasData={false}
        {...extraProps}
      />
    );

    // Wait for async effects to settle
    await waitFor(() => {
      expect(vi.mocked(gamedayApi.listSeasons)).toHaveBeenCalled();
    });

    return result;
  }

  it('renders accordion open by default', async () => {
    await renderAccordion();

    expect(screen.getByText('Test Gameday')).toBeInTheDocument();
    expect(screen.getByText('01/05/2026')).toBeInTheDocument();

    const button = document.querySelector('.accordion-button');
    expect(button).not.toHaveClass('collapsed');
  });

  it('shows form fields and action buttons when open', async () => {
    await renderAccordion();
    // Accordion starts open — no click needed
    expect(screen.getByLabelText('Gameday Name')).toBeVisible();
    expect(screen.getByLabelText('Gameday Date')).toBeVisible();

    // Action buttons should now be in the body
    expect(screen.getByTestId('publish-schedule-button')).toBeInTheDocument();
    expect(screen.getByText('Clear Schedule')).toBeInTheDocument();
    expect(screen.getByText('Delete Gameday')).toBeInTheDocument();
  });

  it('calls onUpdate when fields change', async () => {
    await renderAccordion({ onUpdate: mockOnUpdate });
    // Accordion starts open — no click needed
    const nameInput = screen.getByLabelText('Gameday Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ name: 'Updated Name' });
  });

  it('collapses when forceCollapsed becomes true', async () => {
    const { rerender } = await renderAccordion({ forceCollapsed: false });
    expect(document.querySelector('.accordion-button')).not.toHaveClass('collapsed');

    rerender(
      <GamedayMetadataAccordion
        metadata={mockMetadata}
        onUpdate={vi.fn()} onClearAll={vi.fn()} onDelete={vi.fn()}
        onPublish={vi.fn()} onUnlock={vi.fn()}
        onHighlight={vi.fn()} validation={mockValidation}
        readOnly={false} hasData={false}
        forceCollapsed={true}
      />
    );
    expect(document.querySelector('.accordion-button')).toHaveClass('collapsed');
  });

  it('stays collapsed after forceCollapsed returns to false (no auto-reopen)', async () => {
    const { rerender } = await renderAccordion({ forceCollapsed: true });
    expect(document.querySelector('.accordion-button')).toHaveClass('collapsed');

    rerender(
      <GamedayMetadataAccordion
        metadata={mockMetadata}
        onUpdate={vi.fn()} onClearAll={vi.fn()} onDelete={vi.fn()}
        onPublish={vi.fn()} onUnlock={vi.fn()}
        onHighlight={vi.fn()} validation={mockValidation}
        readOnly={false} hasData={false}
        forceCollapsed={false}
      />
    );
    // Must still be collapsed — scroll-back-up must not re-open the accordion
    expect(document.querySelector('.accordion-button')).toHaveClass('collapsed');
  });

  it('renders existing resource URLs from the loaded gameday', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockMetadata,
      resource_urls: [
        { id: 5, url: 'https://twitch.tv/live', description: 'Livestream' },
      ],
    } as never);

    await renderAccordion();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Livestream')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('https://twitch.tv/live')).toBeInTheDocument();
  });

  it('adds a new URL row when the add button is clicked', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata, resource_urls: [],
    } as never);
    await renderAccordion();

    await userEvent.click(screen.getByTestId('resource-url-add'));

    expect(screen.getAllByTestId('resource-url-row')).toHaveLength(1);
  });

  it('saves the URL list via patchGameday on blur', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata, resource_urls: [],
    } as never);
    vi.mocked(gamedayApi.patchGameday).mockResolvedValue(mockMetadata as never);
    await renderAccordion();

    await userEvent.click(screen.getByTestId('resource-url-add'));
    await userEvent.type(screen.getByTestId('resource-url-description'), 'Livestream');
    await userEvent.type(screen.getByTestId('resource-url-url'), 'https://twitch.tv/live');
    fireEvent.blur(screen.getByTestId('resource-url-url'));

    await waitFor(() => {
      expect(vi.mocked(gamedayApi.patchGameday)).toHaveBeenCalledWith(1, {
        resource_urls: [{ url: 'https://twitch.tv/live', description: 'Livestream' }],
      });
    });
  });

  it('saves URLs using the gamedayId prop when metadata carries no id', async () => {
    // In the real designer, metadata is loaded from the persisted designer-state
    // JSON, which does not include the gameday id. The id comes from the route and
    // is passed in via the gamedayId prop. Saving must use that prop, not metadata.id.
    const metadataWithoutId = { ...mockMetadata, id: undefined } as unknown as GamedayMetadata;
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata, resource_urls: [],
    } as never);
    vi.mocked(gamedayApi.patchGameday).mockResolvedValue(mockMetadata as never);

    await renderAccordion({ metadata: metadataWithoutId, gamedayId: 634 });

    await userEvent.click(screen.getByTestId('resource-url-add'));
    await userEvent.type(screen.getByTestId('resource-url-description'), 'Livestream');
    await userEvent.type(screen.getByTestId('resource-url-url'), 'https://twitch.tv/live');
    fireEvent.blur(screen.getByTestId('resource-url-url'));

    await waitFor(() => {
      expect(vi.mocked(gamedayApi.patchGameday)).toHaveBeenCalledWith(634, {
        resource_urls: [{ url: 'https://twitch.tv/live', description: 'Livestream' }],
      });
    });
  });

  it('deletes a URL row and persists the shorter list', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockMetadata,
      resource_urls: [{ id: 5, url: 'https://x.tv/a', description: 'A' }],
    } as never);
    vi.mocked(gamedayApi.patchGameday).mockResolvedValue(mockMetadata as never);
    await renderAccordion();

    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('resource-url-delete'));

    await waitFor(() => {
      expect(vi.mocked(gamedayApi.patchGameday)).toHaveBeenCalledWith(1, { resource_urls: [] });
    });
    expect(screen.queryByTestId('resource-url-row')).not.toBeInTheDocument();
  });

  it('does not allow editing URLs in readOnly mode', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockMetadata,
      resource_urls: [{ id: 5, url: 'https://x.tv/a', description: 'A' }],
    } as never);
    await renderAccordion({ readOnly: true });

    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeInTheDocument());
    expect(screen.getByTestId('resource-url-url')).toBeDisabled();
    expect(screen.getByTestId('resource-url-description')).toBeDisabled();
    expect(screen.queryByTestId('resource-url-add')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resource-url-delete')).not.toBeInTheDocument();
  });

  it('shows an error when saving URLs fails', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockMetadata, resource_urls: [],
    } as never);
    vi.mocked(gamedayApi.patchGameday).mockRejectedValueOnce(new Error('boom'));
    await renderAccordion();

    await userEvent.click(screen.getByTestId('resource-url-add'));
    await userEvent.type(screen.getByTestId('resource-url-description'), 'Livestream');
    await userEvent.type(screen.getByTestId('resource-url-url'), 'https://twitch.tv/live');
    fireEvent.blur(screen.getByTestId('resource-url-url'));

    await waitFor(() => {
      expect(screen.getByTestId('resource-url-error')).toBeInTheDocument();
    });
  });

  it('displays the server validation message when a URL is rejected', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata, resource_urls: [],
    } as never);
    // DRF returns a per-entry, per-field error array for invalid URLs.
    vi.mocked(gamedayApi.patchGameday).mockRejectedValueOnce({
      response: { data: { resource_urls: [{ url: ['Enter a valid URL.'] }] } },
    });
    await renderAccordion();

    await userEvent.click(screen.getByTestId('resource-url-add'));
    await userEvent.type(screen.getByTestId('resource-url-description'), 'Stream');
    await userEvent.type(screen.getByTestId('resource-url-url'), 'not-a-url');
    fireEvent.blur(screen.getByTestId('resource-url-url'));

    await waitFor(() => {
      expect(screen.getByTestId('resource-url-error')).toHaveTextContent('Enter a valid URL.');
    });
  });

  it('adopts the server id for a newly added URL after save', async () => {
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockMetadata, resource_urls: [],
    } as never);
    vi.mocked(gamedayApi.patchGameday).mockResolvedValue({
      ...mockMetadata,
      resource_urls: [{ id: 42, url: 'https://twitch.tv/live', description: 'Livestream' }],
    } as never);
    await renderAccordion();

    await userEvent.click(screen.getByTestId('resource-url-add'));
    await userEvent.type(screen.getByTestId('resource-url-description'), 'Livestream');
    await userEvent.type(screen.getByTestId('resource-url-url'), 'https://twitch.tv/live');
    fireEvent.blur(screen.getByTestId('resource-url-url'));

    // After adoption, editing again and blurring should send the adopted id
    await waitFor(() => expect(vi.mocked(gamedayApi.patchGameday)).toHaveBeenCalled());
    fireEvent.blur(screen.getByTestId('resource-url-description'));
    await waitFor(() => {
      const calls = vi.mocked(gamedayApi.patchGameday).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall?.[1]).toEqual({
        resource_urls: [{ id: 42, url: 'https://twitch.tv/live', description: 'Livestream' }],
      });
    });
  });

  it('triggers unlock schedule when button is clicked', async () => {
    const user = userEvent.setup();
    const publishedMetadata = { ...mockMetadata, status: 'PUBLISHED' };
    const mockOnUnlock = vi.fn();

    vi.mocked(gamedayApi.listSeasons).mockResolvedValue([]);
    vi.mocked(gamedayApi.listLeagues).mockResolvedValue([]);

    renderAccordion({
      metadata: publishedMetadata,
      onUnlock: mockOnUnlock,
    });

    const unlockBtn = await screen.findByRole('button', { name: /Unlock Schedule/i });
    await user.click(unlockBtn);

    expect(mockOnUnlock).toHaveBeenCalled();
  });

  it('disables unlock and shows a hint when the gameday has results', async () => {
    const user = userEvent.setup();
    const lockedWithResults = { ...mockMetadata, status: 'PUBLISHED', has_results: true };
    const mockOnUnlock = vi.fn();

    vi.mocked(gamedayApi.listSeasons).mockResolvedValue([]);
    vi.mocked(gamedayApi.listLeagues).mockResolvedValue([]);

    renderAccordion({
      metadata: lockedWithResults,
      onUnlock: mockOnUnlock,
    });

    const unlockBtn = await screen.findByRole('button', { name: /Unlock Schedule/i });
    expect(unlockBtn).toBeDisabled();
    // hint is surfaced via the wrapping element's title
    expect(screen.getByTitle(/Cannot unlock/i)).toBeInTheDocument();

    await user.click(unlockBtn);
    expect(mockOnUnlock).not.toHaveBeenCalled();
  });
});
