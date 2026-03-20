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
});
