/**
 * Additional coverage tests for GamedayMetadataAccordion
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GamedayMetadataAccordion from "../GamedayMetadataAccordion";
import { GamedayMetadata } from "../types/flowchart";
import i18n from "../../i18n/testConfig";

describe('GamedayMetadataAccordion Coverage', () => {
  const mockMetadata: GamedayMetadata = {
    id: 1,
    name: 'Test Gameday',
    date: '2026-04-13',
    start: '10:00',
    address: 'Main Field',
    status: 'DRAFT',
  };

  const mockOnUpdate = vi.fn();
  const mockOnHighlight = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles validation popover hover logic', async () => {
    const validation = {
      isValid: false,
      errors: [{ type: 'unknown', message: 'Unknown error', affectedNodes: ['node-1'] }],
      warnings: [],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
      />
    );

    const badge = screen.getByTestId('validation-badges');
    
    // Mouse enter
    fireEvent.mouseEnter(badge);
    await waitFor(() => expect(screen.getByText(/Validation/i)).toBeInTheDocument());

    // Mouse leave
    fireEvent.mouseLeave(badge);
    
    // Popover should stay for 300ms
    expect(screen.getByText(/Validation/i)).toBeInTheDocument();

    // Mouse enter again should keep it
    fireEvent.mouseEnter(badge);
    await new Promise(r => setTimeout(r, 400));
    expect(screen.getByText(/Validation/i)).toBeInTheDocument();

    // Mouse leave for real
    fireEvent.mouseLeave(badge);
    
    // Popover should be gone after >300ms
    await waitFor(() => {
        expect(screen.queryByText(/Validation/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('renders status COMPLETED and default status colors', () => {
    const { rerender } = render(
      <GamedayMetadataAccordion 
        metadata={{ ...mockMetadata, status: 'COMPLETED' }} 
        onUpdate={mockOnUpdate} 
      />
    );
    expect(screen.getByTestId('gameday-metadata-header')).toHaveClass('header-status-secondary');

    rerender(
      <GamedayMetadataAccordion 
        metadata={{ ...mockMetadata, status: 'UNKNOWN' }} 
        onUpdate={mockOnUpdate} 
      />
    );
    expect(screen.getByTestId('gameday-metadata-header')).toHaveClass('header-status-light');
  });

  it('uses messageKey for validation messages', () => {
    const validation = {
      isValid: false,
      errors: [
        { 
            type: 'no_games', 
            messageKey: 'no_games', 
            affectedNodes: ['node-1'] 
        }
      ],
      warnings: [
        {
            type: 'team_overlap',
            messageKey: 'team_overlap',
            messageParams: { team: 'T1', game1: 'G1', game2: 'G2' },
            affectedNodes: ['node-2']
        }
      ],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId('validation-badges'));
    
    // Should use translations from validation namespace
    expect(screen.getByText(/No games have been added/i)).toBeInTheDocument();
    expect(screen.getByText(/Team "T1" is scheduled in overlapping games/i)).toBeInTheDocument();
  });

  it('handles clicking on error in popover', () => {
    const validation = {
      isValid: false,
      errors: [{ type: 'field_overlap', message: 'Field overlap', affectedNodes: ['field-1'] }],
      warnings: [],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
        onHighlight={mockOnHighlight}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId('validation-badges'));
    const errorItem = screen.getByText('Field overlap').closest('.list-group-item');
    fireEvent.click(errorItem!);

    expect(mockOnHighlight).toHaveBeenCalledWith('field-1', 'game');
  });

  it('stops propagation when clicking validation badge', () => {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };
    const onSelect = vi.fn();

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
        onSelect={onSelect}
      />
    );

    const badge = screen.getByTestId('validation-badges');
    fireEvent.click(badge);

    // Accordion header click would normally trigger onSelect, but we stop propagation
    expect(onSelect).not.toHaveBeenCalled();
  });
});
