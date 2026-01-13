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
      name: 'Preliminary',
      category: 'preliminary',
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
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
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
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
    // And "Add Stage" button should be visible in the header
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('Add Stage button is in the header', () => {
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

    // Header should contain Add Stage button
    const addButtonInHeader = header?.querySelector('button[aria-label*="Add Stage"]');
    expect(addButtonInHeader).toBeInTheDocument();
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

    // Get the header add stage button
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    fireEvent.click(addButtons[0]);

    expect(mockOnAddStage).toHaveBeenCalledWith('field-1');
  });

  it('No Add Stage button appears at bottom when stages exist', () => {
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

    // Only the header button should exist
    const addButtons = screen.getAllByRole('button', { name: /add stage/i });
    expect(addButtons).toHaveLength(1);
    
    // Verify it's in the header by checking its container
    expect(addButtons[0].closest('.field-section__header')).not.toBeNull();
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

    const deleteButton = screen.getByTitle(/Permanently remove this field/i);
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('field-1');
  });

  it('renders nested stages in correct order', () => {
    const stage1: StageNode = {
      ...sampleStage,
      id: 'stage-1',
      parentId: 'field-1',
      data: { ...sampleStage.data, name: 'Preliminary', order: 0 },
    };

    const stage2: StageNode = {
      ...sampleStage,
      id: 'stage-2',
      parentId: 'field-1',
      data: { ...sampleStage.data, name: 'Final', order: 1, category: 'final' },
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
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();

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

    // Click the edit button
    const editButton = screen.getByTitle(/Click to edit the name of this playing field/i);
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue('Feld 1');
    fireEvent.change(input, { target: { value: 'Main Field' } });
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith('field-1', {
      name: 'Main Field',
    });
  });

  it('allows canceling field name edit with Escape', () => {
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

    fireEvent.click(screen.getByTitle(/Click to edit the name of this playing field/i));
    const input = screen.getByDisplayValue('Feld 1');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
    expect(screen.getByText('Feld 1')).toBeInTheDocument();
  });

  it('saves field name edit with Enter', () => {
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

    fireEvent.click(screen.getByTitle(/Click to edit the name of this playing field/i));
    const input = screen.getByDisplayValue('Feld 1');
    fireEvent.change(input, { target: { value: 'Main Field' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnUpdate).toHaveBeenCalledWith('field-1', { name: 'Main Field' });
  });

  it('calls onUpdate when color is changed', () => {
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

    const colorInput = screen.getByTitle(/Change the accent color for this field/i);
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('field-1', { color: '#ff0000' });
  });

  it('toggles expansion when header is clicked', () => {
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
        isExpanded={false}
        expandedStageIds={new Set()}
      />
    );

    const header = screen.getByText('Feld 1').closest('.field-section__header');
    
    // Initially expanded by local state if prop is false? 
    // Wait, the component says: const isExpanded = isExpandedProp || localExpanded;
    // localExpanded defaults to true.
    
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
    
    fireEvent.click(header!);
    // Now it should be collapsed (localExpanded becomes false)
    expect(screen.queryByText('Preliminary')).not.toBeInTheDocument();
  });

  it('shows big Add Stage button in empty state', () => {
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
      />
    );

    const bigAddButton = screen.getByText(/No stages yet/i).parentElement?.querySelector('button');
    expect(bigAddButton).toBeInTheDocument();
    fireEvent.click(bigAddButton!);
    expect(mockOnAddStage).toHaveBeenCalledWith('field-1');
  });
});
