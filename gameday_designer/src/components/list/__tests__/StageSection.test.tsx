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
import { GamedayProvider } from '../../../context/GamedayContext';
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
  highlightedElement: null,
  onDynamicReferenceClick: vi.fn(),
  onAddGameToGameEdge: vi.fn(),
  onAddStageToGameEdge: vi.fn(),
  onRemoveEdgeFromSlot: vi.fn(),
  onNotify: vi.fn(),
  isExpanded: true,
  readOnly: false,
  ...overrides,
});

const renderStage = (props: StageSectionProps) => {
  return render(
    <GamedayProvider>
      <StageSection {...props} />
    </GamedayProvider>
  );
};

describe('StageSection', () => {
  // Sample stage node
  const sampleStage: StageNode = {
    id: 'stage-1',
    type: 'stage',
    parentId: 'field-1',
    position: { x: 0, y: 0 },
    data: {
      type: 'stage',
      name: 'Preliminary',
      category: 'preliminary',
      stageType: 'STANDARD',
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
      stage: 'Preliminary',
      standing: 'Game 1',
      fieldId: null,
      official: null,
      breakAfter: 0,
    },
  };

  it('renders stage with name and type badge', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage, sampleGame],
      })
    );

    // Stage name should be visible
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
  });

  it('shows games when expanded', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage, sampleGame],
      })
    );

    // Should be expanded - there are now TWO "Add Game" buttons (header + body)
    const addGameButtons = screen.getAllByText('Add Game');
    expect(addGameButtons.length).toBeGreaterThan(0);
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();

    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
        onDelete: mockOnDelete,
      })
    );

    const deleteButton = screen.getByTitle(/Permanently remove this phase/i);
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('stage-1');
  });

  it('shows correct stage name for different stages', () => {
    const finalStage: StageNode = {
      ...sampleStage,
      data: {
        ...sampleStage.data,
        name: 'Final',
        category: 'final',
      },
    };

    renderStage(
      createDefaultProps({
        stage: finalStage,
        allNodes: [finalStage],
      })
    );

    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('allows inline editing of stage name', () => {
    const mockOnUpdate = vi.fn();

    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
        onUpdate: mockOnUpdate,
      })
    );

    // Click the edit button
    const editButton = screen.getByTitle(/edit the name of this tournament phase/i);
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue('Preliminary');
    fireEvent.change(input, { target: { value: 'Neue Vorrunde' } });
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', {
      name: 'Neue Vorrunde',
    });
  });

  it('displays Games section', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage, sampleGame],
      })
    );

    // Should have game table section
    expect(screen.getByText(/Games/i)).toBeInTheDocument();
  });

  it('shows empty state when stage has no games', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
      })
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

    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage, sampleGame, otherGame],
      })
    );

    expect(screen.getByText('Game 1')).toBeInTheDocument();
  });

  describe('Add Game button pattern', () => {
    it('Add Game button is in the header', () => {
      const { container } = renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame],
        })
      );

      const header = container.querySelector('.stage-section__header');

      // Header should contain Add Game button
      const addButtonInHeader = header?.querySelector('button[aria-label*="Add Game"]');
      expect(addButtonInHeader).toBeInTheDocument();
    });

    it('calls onAddGame when Add Game button is clicked', () => {
      const mockOnAddGame = vi.fn();

      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onAddGame: mockOnAddGame,
        })
      );

      // Get header Add Game button
      const addButtons = screen.getAllByRole('button', { name: /add game/i });
      fireEvent.click(addButtons[0]);

      expect(mockOnAddGame).toHaveBeenCalledWith('stage-1');
    });

    it('No Add Game button appears at bottom when games exist', () => {
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage, sampleGame],
        })
      );

      // Should only find one Add Game button (in header)
      const addButtons = screen.getAllByRole('button', { name: /add game/i });
      expect(addButtons).toHaveLength(1);
      
      // Verify it's in the header
      expect(addButtons[0].closest('.stage-section__header')).not.toBeNull();
    });

    it('shows inline Add Game button in empty state (big button)', () => {
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
        })
      );

      // Should show empty state text
      expect(screen.getByText(/no games/i)).toBeInTheDocument();

      // Should show big Add Game button in body (there are two buttons now, header and body)
      const addButtons = screen.getAllByRole('button', { name: /add game/i });
      expect(addButtons.length).toBeGreaterThan(1);
      
      const bodyButton = addButtons.find(btn => btn.closest('.stage-section__body'));
      expect(bodyButton).toBeDefined();
    });
  });

  it('allows canceling stage name edit with Escape', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
      })
    );

    fireEvent.click(screen.getByTitle(/edit the name of this tournament phase/i));
    const input = screen.getByDisplayValue('Preliminary');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
  });

  it('saves stage name edit with Enter', () => {
    const mockOnUpdate = vi.fn();
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
        onUpdate: mockOnUpdate,
      })
    );

    fireEvent.click(screen.getByTitle(/edit the name of this tournament phase/i));
    const input = screen.getByDisplayValue('Preliminary');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', { name: 'New Name' });
  });

  it('calls onUpdate when start time is changed', () => {
    const mockOnUpdate = vi.fn();
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
        onUpdate: mockOnUpdate,
      })
    );

    const timeInput = screen.getByLabelText(/label.start/i);
    fireEvent.change(timeInput, { target: { value: '10:30' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', { startTime: '10:30' });
  });

  it('calls onUpdate when color is changed', () => {
    const mockOnUpdate = vi.fn();
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage],
        onUpdate: mockOnUpdate,
      })
    );

    const colorInput = screen.getByTitle(/Change the accent color/i);
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', { color: '#00ff00' });
  });

  it('toggles expansion when header is clicked', () => {
    renderStage(
      createDefaultProps({
        stage: sampleStage,
        allNodes: [sampleStage, sampleGame],
        isExpanded: false,
      })
    );

    const header = screen.getByText('Preliminary').closest('.stage-section__header');
    
    // Initially expanded by local state if prop is false
    expect(screen.getByText('Game 1')).toBeInTheDocument();
    
    fireEvent.click(header!);
    // Now it should be collapsed
    expect(screen.queryByText('Game 1')).not.toBeInTheDocument();
  });

  describe('Stage Type and Focus refinements', () => {
    it('shows Ranking Stage badge when stage type is RANKING', () => {
      const rankingStage: StageNode = {
        ...sampleStage,
        data: {
          ...sampleStage.data,
          stageType: 'RANKING',
        },
      };

      renderStage(
        createDefaultProps({
          stage: rankingStage,
          allNodes: [rankingStage],
        })
      );

      expect(screen.getByText(/Ranking Stage/i)).toBeInTheDocument();
    });

    it('allows changing stage type in edit mode', () => {
      const mockOnUpdate = vi.fn();
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onUpdate: mockOnUpdate,
        })
      );

      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit the name/i));

      // Select Ranking Stage
      const typeSelect = screen.getByLabelText(/label.type/i);
      fireEvent.change(typeSelect, { target: { value: 'RANKING' } });

      // Click Save
      fireEvent.click(screen.getByTitle(/Save/i));

      expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', {
        stageType: 'RANKING',
      });
    });

    it('Smart Blur: does not close edit mode when clicking on type selector', () => {
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
        })
      );

      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit the name/i));
      expect(screen.getByDisplayValue('Preliminary')).toBeInTheDocument();

      // Click on type select - should not close edit mode
      const typeSelect = screen.getByLabelText(/label.type/i);
      const nameInput = screen.getByDisplayValue('Preliminary');
      
      // Simulate blur with relatedTarget being the select
      fireEvent.blur(nameInput, { relatedTarget: typeSelect });
      
      // Should still be in edit mode
      expect(screen.getByDisplayValue('Preliminary')).toBeInTheDocument();
    });

    it('Smart Blur: closes edit mode when clicking outside the edit zone', () => {
      const mockOnUpdate = vi.fn();
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onUpdate: mockOnUpdate,
        })
      );

      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit the name/i));
      const nameInput = screen.getByDisplayValue('Preliminary');

      // Simulate blur with relatedTarget being null (e.g. clicking body)
      fireEvent.blur(nameInput);

      // Should have exited edit mode
      expect(screen.queryByDisplayValue('Preliminary')).not.toBeInTheDocument();
      expect(mockOnUpdate).not.toHaveBeenCalled(); // No change made
    });

    it('handleSaveEdit: saves both name and stage type changes', () => {
      const mockOnUpdate = vi.fn();
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onUpdate: mockOnUpdate,
        })
      );

      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit the name/i));

      // Change name
      const input = screen.getByDisplayValue('Preliminary');
      fireEvent.change(input, { target: { value: 'New Name' } });

      // Change type
      const typeSelect = screen.getByLabelText(/label.type/i);
      fireEvent.change(typeSelect, { target: { value: 'RANKING' } });

      // Click Save
      fireEvent.click(screen.getByTitle(/Save/i));

      expect(mockOnUpdate).toHaveBeenCalledWith('stage-1', {
        name: 'New Name',
        stageType: 'RANKING',
      });
    });

    it('handleSaveEdit: does not call onUpdate if nothing changed', () => {
      const mockOnUpdate = vi.fn();
      renderStage(
        createDefaultProps({
          stage: sampleStage,
          allNodes: [sampleStage],
          onUpdate: mockOnUpdate,
        })
      );

      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit the name/i));

      // Click Save without changing anything
      fireEvent.click(screen.getByTitle(/Save/i));

      expect(mockOnUpdate).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('Preliminary')).not.toBeInTheDocument();
    });
  });
});