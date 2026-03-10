/**
 * Tests for GamedayMetadataAccordion Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import GamedayMetadataAccordion from '../GamedayMetadataAccordion';
import type { GamedayMetadata } from '../../types';
import { gamedayApi } from '../../api/gamedayApi';
import '../../i18n/testConfig';

import { Accordion } from 'react-bootstrap';

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

  it('renders accordion collapsed by default', () => {
    render(
      <Accordion>
        <GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />
      </Accordion>
    );
    
    expect(screen.getByText('Test Gameday')).toBeInTheDocument();
    expect(screen.getByText('01.05.2026')).toBeInTheDocument();
    
    const button = document.querySelector('.accordion-button');
    expect(button).toHaveClass('collapsed');
  });

  it('expands to show form fields and action buttons', () => {
    render(
      <Accordion>
        <GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />
      </Accordion>
    );
    
    fireEvent.click(document.querySelector('.accordion-button')!);
    
    expect(screen.getByLabelText('Gameday Name')).toBeVisible();
    expect(screen.getByLabelText('Gameday Date')).toBeVisible();
    
    // Action buttons should now be in the body
    expect(screen.getByTestId('publish-schedule-button')).toBeInTheDocument();
    expect(screen.getByText('Clear Schedule')).toBeInTheDocument();
    expect(screen.getByText('Delete Gameday')).toBeInTheDocument();
  });

  it('calls onUpdate when fields change', () => {
    render(
      <Accordion>
        <GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />
      </Accordion>
    );
    fireEvent.click(document.querySelector('.accordion-button')!);

    const nameInput = screen.getByLabelText('Gameday Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ name: 'Updated Name' });
  });

  it('triggers unlock schedule when button is clicked', async () => {
    const user = userEvent.setup();
    const publishedMetadata = { ...mockMetadata, status: 'PUBLISHED' };
    const mockOnUnlock = vi.fn();
    
    vi.mocked(gamedayApi.listSeasons).mockResolvedValue([]);
    vi.mocked(gamedayApi.listLeagues).mockResolvedValue([]);

    render(
      <Accordion defaultActiveKey="0">
        <GamedayMetadataAccordion 
          metadata={publishedMetadata} 
          onUpdate={mockOnUpdate}
          onUnlock={mockOnUnlock}
        />
      </Accordion>
    );

    const unlockBtn = await screen.findByRole('button', { name: /Unlock Schedule/i });
    await user.click(unlockBtn);

    expect(mockOnUnlock).toHaveBeenCalled();
  });
});
