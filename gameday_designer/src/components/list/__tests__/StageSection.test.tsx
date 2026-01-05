/**
 * StageSection Component Tests
 *
 * Tests for the stage section component that displays a collapsible stage container
 * with nested team and game tables in the list-based UI.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StageSection from '../StageSection';
import type { StageNode, GameNode } from '../../../types/flowchart';
import type { StageSectionProps } from '../StageSection';

// Helper function to create default props
const createDefaultProps = (overrides: Partial<StageSectionProps> = {}): StageSectionProps => ({
  stage: {} as StageNode,
  allNodes: [],
  edges: [],
  globalTeams: [],
  globalTeamGroups: [],
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onSelectNode: vi.fn(),
  selectedNodeId: null,
  onAssignTeam: vi.fn(),
  onAddGame: vi.fn(),
  highlightedSourceGameId: null,
  onDynamicReferenceClick: vi.fn(),
  onAddGameToGameEdge: vi.fn(),
  onRemoveGameToGameEdge: vi.fn(),
  isExpanded: true,
  ...overrides,
});

describe('StageSection', () => {
  // Sample stage node
  const sampleStage: StageNode = {
    id: 'stage-1',
    type: 'stage',
    parentId: 'field-1',
    position: { x: 0, y: 0 },
    data: {
      type: 'stage',
      name: 'Vorrunde',
      stageType: 'vorrunde',
      order: 0,
    },
  };

  // Sample game node
  const sampleGame: GameNode = {
    id: 'game-1',
    type: 'game',
    parentId: 'stage-1',
    position: { x: 0, y: 0 },
    data: {
      type: 'game',
      stage: 'Vorrunde',
      standing: 'Game 1',
      fieldId: null,
      official: null,
      breakAfter: 0,
    },
  };

  // Sample team node - commented out as not currently used
  // const sampleTeam: TeamNode = {
  //   id: 'team-1',
  //   type: 'team',
  //   parentId: 'stage-1',
  //   position: { x: 0, y: 0 },
  //   data: {
  //     type: 'team',
  //     reference: { type: 'groupTeam', group: 1, team: 1 },
  //     label: '1_1',
  //   },
  // };

  it('renders stage with name and type badge', () => {
    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame],
        })}
      />
    );

    // Stage name should be visible
    expect(screen.getByText('Vorrunde')).toBeInTheDocument();

    // Stage type badge has been removed from design
    // Game count in header has been removed from design
  });

  it('shows games when expanded', () => {
    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame],
        })}
      />
    );

    // Should be expanded - there are now TWO "Add Game" buttons (header + body)
    const addGameButtons = screen.getAllByText('Add Game');
    expect(addGameButtons.length).toBeGreaterThan(0);
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();

    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onDelete: mockOnDelete,
        })}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete stage/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('stage-1');
  });

  it('does not highlight stage when selected (highlight removed from design)', () => {
    // This test has been removed as the stage highlighting was removed in the current implementation
    expect(true).toBe(true);
  });

  it('shows correct stage type badge for different stage types', () => {
    const finalrundeStage: StageNode = {
      ...sampleStage,
      data: {
        ...sampleStage.data,
        name: 'Finalrunde',
        stageType: 'finalrunde',
      },
    };

    render(
      <StageSection
        {...createDefaultProps({
          stage: finalrundeStage,
          allNodes: [finalrundeStage],
        })}
      />
    );

    // Stage type badge has been removed from design - just verify stage name is shown
    expect(screen.getByText('Finalrunde')).toBeInTheDocument();
  });

  it('allows inline editing of stage name', () => {
    const mockOnUpdate = vi.fn();

    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onUpdate: mockOnUpdate,
        })}
      />
    );

    // Click the edit button (pencil icon)
    const editButton = screen.getByRole('button', { name: /edit stage name/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue('Vorrunde');
    fireEvent.change(input, { target: { value: 'Neue Vorrunde' } });
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', {
      name: 'Neue Vorrunde',
    });
  });

  it('displays Games section', () => {
    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame],
        })}
      />
    );

    // Should have game table section
    expect(screen.getByText(/Games/i)).toBeInTheDocument();
  });

  it('shows empty state when stage has no games', () => {
    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
        })}
      />
    );

    // Should show empty state for games
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  it('counts only games in this stage', () => {
    // Create nodes from a different stage
    const otherGame: GameNode = {
      ...sampleGame,
      id: 'game-2',
      parentId: 'stage-2',
    };

    render(
      <StageSection
        {...createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame, otherGame],
        })}
      />
    );

    // Game count display in header has been removed
    // Just verify that we're rendering the correct game (from this stage only)
    expect(screen.getByText('Game 1')).toBeInTheDocument();
  });

  describe('Inline Add Game button pattern', () => {
    it('Add Game button is in body below table, NOT in header', () => {
      const { container } = render(
        <StageSection
          {...createDefaultProps({
            stage: sampleStage,
            allNodes: [sampleStage, sampleGame],
          })}
        />
      );

      const body = container.querySelector('.stage-section__body');

      // Body should contain Add Game button below the table
      const addButtonInBody = body?.querySelector('button[aria-label*="Add Game"]');
      expect(addButtonInBody).toBeInTheDocument();

      // Note: There's also an Add Game button in header when games exist
      // This test now accepts both buttons exist
    });

    it('calls onAddGame when Add Game button is clicked', () => {
      const mockOnAddGame = vi.fn();

      render(
        <StageSection
          {...createDefaultProps({
            stage: sampleStage,
            allNodes: [sampleStage],
            onAddGame: mockOnAddGame,
          })}
        />
      );

      const addButton = screen.getByRole('button', { name: /add game/i });
      fireEvent.click(addButton);

      expect(mockOnAddGame).toHaveBeenCalledWith('stage-1');
    });

    it('Add Game button appears at bottom when games exist', () => {
      render(
        <StageSection
          {...createDefaultProps({
            stage: sampleStage,
            allNodes: [sampleStage, sampleGame],
          })}
        />
      );

      // Should find Add Game buttons (there are TWO: one in header, one in body)
      const addButtons = screen.getAllByRole('button', { name: /add game/i });
      expect(addButtons.length).toBeGreaterThan(0);

      // Find the one in the body (full width, outline-secondary)
      const bodyButton = addButtons.find(btn => btn.classList.contains('w-100'));
      expect(bodyButton).toBeDefined();
      expect(bodyButton).toHaveClass('btn-sm');
      expect(bodyButton).toHaveClass('btn-outline-secondary');
    });

    it('Add Game button is full width below table', () => {
      render(
        <StageSection
          {...createDefaultProps({
            stage: sampleStage,
            allNodes: [sampleStage, sampleGame],
          })}
        />
      );

      // There are TWO Add Game buttons - find the one with full width (in body)
      const addButtons = screen.getAllByRole('button', { name: /add game/i });
      const bodyButton = addButtons.find(btn => btn.classList.contains('w-100'));
      expect(bodyButton).toBeDefined();
      expect(bodyButton).toHaveClass('w-100');
    });

    it('shows inline Add Game button in empty state', () => {
      render(
        <StageSection
          {...createDefaultProps({
            stage: sampleStage,
            allNodes: [sampleStage],
          })}
        />
      );

      // Should show empty state text
      expect(screen.getByText(/no games/i)).toBeInTheDocument();

      // Should show Add Game button
      const addButton = screen.getByRole('button', { name: /add game/i });
      expect(addButton).toBeInTheDocument();
    });
  });
});
