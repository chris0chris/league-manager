/**
 * Additional coverage tests for GamedayMetadataAccordion
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GamedayMetadataAccordion from "../GamedayMetadataAccordion";
import type { GamedayMetadata, FlowValidationResult, FlowValidationErrorType, FlowValidationWarningType } from "../../types/flowchart";
import i18n from "../../i18n/testConfig";
import { gamedayApi } from "../../api/gamedayApi";

// Mock the network layer so the component's mount effects (listSeasons/
// listLeagues/getGameday) resolve instead of rejecting. Unmocked axios calls
// reject asynchronously after the test finishes, and the resulting late
// console.error lands during vitest worker teardown -> "Closing rpc while
// onUserConsoleLog was pending" (flaky EnvironmentTeardownError).
vi.mock("../../api/gamedayApi");

describe('GamedayMetadataAccordion Coverage', () => {
  const mockMetadata: GamedayMetadata = {
    id: 1,
    name: 'Test Gameday',
    date: '2026-04-13',
    start: '10:00',
    format: 'tournament',
    author: 1,
    address: 'Main Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
  };

  const mockOnUpdate = vi.fn();
  const mockOnHighlight = vi.fn();
  const mockAccordionProps = {
    onClearAll: vi.fn(),
    onDelete: vi.fn(),
    onPublish: vi.fn(),
    onUnlock: vi.fn(),
    readOnly: false,
    hasData: true,
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(gamedayApi.listSeasons).mockResolvedValue([]);
    vi.mocked(gamedayApi.listLeagues).mockResolvedValue([]);
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({
      ...mockMetadata,
      resource_urls: [],
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles validation popover hover logic', async () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [{ id: 'err-1', type: 'incomplete_game_inputs' as FlowValidationErrorType, message: 'Unknown error', affectedNodes: ['node-1'] }],
      warnings: [],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
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

  it('renders status IN_PROGRESS and varied statuses', () => {
    const validation: FlowValidationResult = { isValid: true, errors: [], warnings: [] };
    const { rerender } = render(
      <GamedayMetadataAccordion 
        metadata={{ ...mockMetadata, status: 'IN_PROGRESS' }} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );
    expect(screen.getByTestId('gameday-metadata-header')).toHaveClass('header-status-primary');

    rerender(
      <GamedayMetadataAccordion 
        metadata={{ ...mockMetadata, status: 'COMPLETED' }} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );
    expect(screen.getByTestId('gameday-metadata-header')).toHaveClass('header-status-secondary');

    rerender(
      <GamedayMetadataAccordion 
        metadata={{ ...mockMetadata, status: 'UNKNOWN' }} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );
    expect(screen.getByTestId('gameday-metadata-header')).toHaveClass('header-status-light');
  });

  it('renders success badge when valid and no warnings', () => {
    const validation: FlowValidationResult = { isValid: true, errors: [], warnings: [] };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );

    const badges = screen.getByTestId('validation-badges');
    expect(badges.querySelector('.bi-check-circle-fill')).toBeInTheDocument();
  });

  it('handles clicking on varied error/warning types in popover', () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [
        { id: 'err-1', type: 'stage_outside_field' as FlowValidationErrorType, message: 'Stage error', affectedNodes: ['stage-1'] },
        { id: 'err-2', type: 'team_outside_container' as FlowValidationErrorType, message: 'Team error', affectedNodes: ['team-1'] }
      ],
      warnings: [
        { id: 'warn-1', type: 'unused_field' as FlowValidationWarningType, message: 'Field error', affectedNodes: ['field-1'] },
        { id: 'warn-2', type: 'broken_progression' as FlowValidationWarningType, message: 'Progression warning', affectedNodes: ['game-1'] }
      ],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
        onHighlight={mockOnHighlight}
        {...mockAccordionProps}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId('validation-badges'));
    
    // Click stage error
    fireEvent.click(screen.getByText('Stage error').closest('.list-group-item')!);
    expect(mockOnHighlight).toHaveBeenLastCalledWith('stage-1', 'stage');

    // Click field error
    fireEvent.click(screen.getByText('Field error').closest('.list-group-item')!);
    expect(mockOnHighlight).toHaveBeenLastCalledWith('field-1', 'field');

    // Click team error
    fireEvent.click(screen.getByText('Team error').closest('.list-group-item')!);
    expect(mockOnHighlight).toHaveBeenLastCalledWith('team-1', 'team');

    // Click progression warning
    fireEvent.click(screen.getByText('Progression warning').closest('.list-group-item')!);
    expect(mockOnHighlight).toHaveBeenLastCalledWith('game-1', 'game');
  });

  it('uses messageKey for validation messages', () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [
        { 
            id: 'err-1',
            type: 'incomplete_game_inputs' as FlowValidationErrorType,
            messageKey: 'no_games', 
            message: '',
            affectedNodes: ['node-1'] 
        }
      ],
      warnings: [
        {
            id: 'warn-1',
            type: 'team_overlap' as FlowValidationWarningType,
            messageKey: 'team_overlap',
            message: '',
            messageParams: { team: 'T1', game1: 'G1', game2: 'G2' },
            affectedNodes: ['node-2']
        }
      ],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId('validation-badges'));
    
    // Should use translations from validation namespace
    expect(screen.getByText(/No games have been added/i)).toBeInTheDocument();
    expect(screen.getByText(/Team "T1" is scheduled in overlapping games/i)).toBeInTheDocument();
  });

  it('handles clicking on error in popover', () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [{ id: 'err-1', type: 'field_overlap' as FlowValidationErrorType, message: 'Field overlap', affectedNodes: ['field-1'] }],
      warnings: [],
    };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        validation={validation}
        onHighlight={mockOnHighlight}
        {...mockAccordionProps}
      />
    );

    fireEvent.mouseEnter(screen.getByTestId('validation-badges'));
    const errorItem = screen.getByText('Field overlap').closest('.list-group-item');
    fireEvent.click(errorItem!);

    expect(mockOnHighlight).toHaveBeenCalledWith('field-1', 'game');
  });

  it('stops propagation when clicking validation badge', () => {
    const validation: FlowValidationResult = { isValid: true, errors: [], warnings: [] };

    render(
      <GamedayMetadataAccordion 
        metadata={mockMetadata} 
        onUpdate={mockOnUpdate}
        onHighlight={mockOnHighlight}
        validation={validation}
        {...mockAccordionProps}
      />
    );

    const badge = screen.getByTestId('validation-badges');
    expect(() => fireEvent.click(badge)).not.toThrow();
  });
});
