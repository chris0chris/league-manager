/**
 * Tests for GamedayMetadataAccordion Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GamedayMetadataAccordion from '../GamedayMetadataAccordion';
import type { GamedayMetadata } from '../../types';

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
  };

  const mockOnUpdate = vi.fn();

  it('renders accordion collapsed by default', () => {
    render(<GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />);
    
    expect(screen.getByText('Test Gameday')).toBeInTheDocument();
    expect(screen.getByText('01.05.2026')).toBeInTheDocument();
    
    const button = screen.getByRole('button', { name: /Test Gameday/ });
    expect(button).toHaveClass('collapsed');
  });

  it('expands to show form fields', () => {
    render(<GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Test Gameday/ }));
    
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.getByLabelText('Date')).toBeVisible();
    expect(screen.getByLabelText('Start Time')).toBeVisible();
    expect(screen.getByLabelText('Venue')).toBeVisible();
  });

  it('calls onUpdate when fields change', () => {
    render(<GamedayMetadataAccordion metadata={mockMetadata} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Gameday/ }));

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ name: 'Updated Name' });
  });
});
