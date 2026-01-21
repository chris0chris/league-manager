/**
 * Additional coverage tests for GamedayCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GamedayCard from '../GamedayCard';
import { GamedayListEntry } from '../../../types';
import i18n from '../../../i18n/testConfig';

describe('GamedayCard Coverage', () => {
  const mockGameday: GamedayListEntry = {
    id: 1,
    name: 'Test Gameday',
    date: '2026-04-13',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'Main Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
  };

  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  it('renders default status variant for unknown status', () => {
    render(
      <GamedayCard 
        gameday={{ ...mockGameday, status: 'UNKNOWN' }} 
        onClick={mockOnClick}
        onDelete={mockOnDelete}
      />
    );
    const badge = screen.getByText('UNKNOWN');
    expect(badge).toHaveClass('bg-light text-muted border');
  });

  it('handles mouse enter and leave for lift effect', () => {
    render(
      <GamedayCard 
        gameday={mockGameday} 
        onClick={mockOnClick}
        onDelete={mockOnDelete}
      />
    );
    // The card itself has role="button"
    const card = screen.getByText('Test Gameday').closest('.card');
    
    fireEvent.mouseEnter(card!);
    expect(card!.style.transform).toBe('translateY(-5px)');
    
    fireEvent.mouseLeave(card!);
    expect(card!.style.transform).toBe('translateY(0)');
  });
});
