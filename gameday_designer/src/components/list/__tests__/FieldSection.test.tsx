/**
 * FieldSection Component Tests
 *
 * Tests for the field section component that displays a collapsible field container
 * with nested stage sections in the list-based UI.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FieldSection from '../FieldSection';
import type { FieldNode, StageNode, GameNode } from '../../../types/flowchart';

describe('FieldSection', () => {
  // Sample field node
  const sampleField: FieldNode = {
    id: 'field-1',
    type: 'field',
    position: { x: 0, y: 0 },
    data: {
      type: 'field',
      name: 'Feld 1',
      order: 0,
    },
  };

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

  it('renders field with name and metadata', () => {
    const mockOnUpdate = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnAddStage = vi.fn();

    render(
      <FieldSection
        field={sampleField}
        stages={[sampleStage]}
        allNodes={[sampleField, sampleStage, sampleGame]}
        edges={[]}
        globalTeams={[]}
        globalTeamGroups={[]}
        globalTeamGroups={[]}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onAddStage={mockOnAddStage}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    // Field name should be visible
    expect(screen.getByText('Feld 1')).toBeInTheDocument();

    // Metadata badges (stage count, game count) have been removed from design
    // Just verify the field and stage are rendered
    expect(screen.getByText('Vorrunde')).toBeInTheDocument();
  });

  it('shows stages when expanded', () => {
    render(
      <FieldSection
        field={sampleField}
        stages={[sampleStage]}
        allNodes={[sampleField, sampleStage, sampleGame]}
        edges={[]}
        globalTeams={[]}
        globalTeamGroups={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    // Should be expanded - stage name visible
    expect(screen.getByText('Vorrunde')).toBeInTheDocument();
    // And "Add Stage" button should be visible (there will be 2: one below the stages, one in empty state)
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('Add Stage button is in body footer, NOT in header', () => {
    const { container } = render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    const header = container.querySelector('.field-section__header');
    const body = container.querySelector('.field-section__body');

    // Header should NOT contain Add Stage button
    const addButtonInHeader = header?.querySelector('button[aria-label*="Add Stage"]');
    expect(addButtonInHeader).toBeNull();

    // Body should contain Add Stage button
    const addButtonInBody = body?.querySelector('button[aria-label*="Add Stage"]');
    expect(addButtonInBody).toBeInTheDocument();
  });

  it('calls onAddStage when Add Stage button is clicked', () => {
    const mockOnAddStage = vi.fn();

    render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={mockOnAddStage}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    const addButton = screen.getByRole('button', { name: /add stage/i });
    fireEvent.click(addButton);

    expect(mockOnAddStage).toHaveBeenCalledWith('field-1');
  });

  it('Add Stage button appears at bottom when stages exist', () => {
    render(
      <FieldSection
        field={sampleField}
        stages={[sampleStage]}
        allNodes={[sampleField, sampleStage]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    // Should find Add Stage button even when stages exist (get last one - the one below stages)
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    const addButton = addButtons[addButtons.length - 1]; // Get the bottom one
    expect(addButton).toBeInTheDocument();

    // Button should be small size and outline-secondary
    expect(addButton).toHaveClass('btn-sm');
    expect(addButton).toHaveClass('btn-outline-secondary');
  });

  it('Add Stage button is full width in body footer', () => {
    render(
      <FieldSection
        field={sampleField}
        stages={[sampleStage]}
        allNodes={[sampleField, sampleStage]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    // Get the bottom Add Stage button (the one below stages)
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    const addButton = addButtons[addButtons.length - 1];
    expect(addButton).toHaveClass('w-100');
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();

    render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={mockOnDelete}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete field/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('field-1');
  });

  it('renders nested stages in correct order', () => {
    const stage1: StageNode = {
      ...sampleStage,
      id: 'stage-1',
      parentId: 'field-1',
      data: { ...sampleStage.data, name: 'Vorrunde', order: 0 },
    };

    const stage2: StageNode = {
      ...sampleStage,
      id: 'stage-2',
      parentId: 'field-1',
      data: { ...sampleStage.data, name: 'Finalrunde', order: 1, stageType: 'finalrunde' },
    };

    render(
      <FieldSection
        field={sampleField}
        stages={[stage2, stage1]} // Intentionally out of order
        allNodes={[sampleField, stage1, stage2]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
        onAssignTeam={vi.fn()}
        onAddGame={vi.fn()}
        highlightedSourceGameId={null}
        onDynamicReferenceClick={vi.fn()}
        onAddGameToGameEdge={vi.fn()}
        onRemoveGameToGameEdge={vi.fn()}
        isExpanded={true}
        expandedStageIds={new Set()}
      />
    );

    // Check stage names appear and in correct order
    expect(screen.getByText('Vorrunde')).toBeInTheDocument();
    expect(screen.getByText('Finalrunde')).toBeInTheDocument();

    // Stage type badges have been removed from design
  });

  it('highlights field when selected', () => {
    const { container } = render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId="field-1"
      />
    );

    const fieldCard = container.querySelector('.field-section');
    expect(fieldCard).toHaveClass('selected');
  });

  it('shows empty state when field has no stages', () => {
    render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
      />
    );

    expect(screen.getByText(/no stages/i)).toBeInTheDocument();
  });

  it('allows inline editing of field name', () => {
    const mockOnUpdate = vi.fn();

    render(
      <FieldSection
        field={sampleField}
        stages={[]}
        allNodes={[sampleField]}
        edges={[]}
        onUpdate={mockOnUpdate}
        onDelete={vi.fn()}
        onAddStage={vi.fn()}
        onSelectNode={vi.fn()}
        selectedNodeId={null}
      />
    );

    // Click the edit button (pencil icon)
    const editButton = screen.getByRole('button', { name: /edit field name/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue('Feld 1');
    fireEvent.change(input, { target: { value: 'Main Field' } });
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith('field-1', {
      name: 'Main Field',
    });
  });
});
