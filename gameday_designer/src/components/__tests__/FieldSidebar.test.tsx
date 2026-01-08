/**
 * Tests for FieldSidebar Component
 *
 * TDD RED Phase: Comprehensive tests for field management sidebar
 *
 * Coverage targets:
 * - Rendering field list and controls
 * - Adding new fields
 * - Editing field names
 * - Deleting fields
 * - Field game count display
 * - Unassigned games warning
 * - Form validation and keyboard shortcuts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldSidebar from '../FieldSidebar';
import type { FlowField, FlowNode } from '../../types/flowchart';

describe('FieldSidebar', () => {
  const mockOnAddField = vi.fn();
  const mockOnUpdateField = vi.fn();
  const mockOnDeleteField = vi.fn();

  const sampleFields: FlowField[] = [
    { id: 'field1', name: 'Field 1', order: 0 },
    { id: 'field2', name: 'Field 2', order: 1 },
  ];

  const sampleNodes: FlowNode[] = [
    {
      id: 'game1',
      type: 'game',
      parentId: 'stage1',
      data: {
        standing: 'Game 1',
        fieldId: 'field1',
        homeTeamId: null,
        awayTeamId: null,
        official: null,
        startTime: null,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'game2',
      type: 'game',
      parentId: 'stage1',
      data: {
        standing: 'Game 2',
        fieldId: 'field1',
        homeTeamId: null,
        awayTeamId: null,
        official: null,
        startTime: null,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'game3',
      type: 'game',
      parentId: 'stage1',
      data: {
        standing: 'Game 3',
        fieldId: 'field2',
        homeTeamId: null,
        awayTeamId: null,
        official: null,
        startTime: null,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'game4',
      type: 'game',
      parentId: 'stage1',
      data: {
        standing: 'Game 4',
        fieldId: null,
        homeTeamId: null,
        awayTeamId: null,
        official: null,
        startTime: null,
      },
      position: { x: 0, y: 0 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the sidebar container', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByTestId('field-sidebar')).toBeInTheDocument();
    });

    it('should render header with title', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('Fields')).toBeInTheDocument();
    });

    it('should render add field input', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByTestId('new-field-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('New field name...')).toBeInTheDocument();
    });

    it('should render add button', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByTestId('add-field-button')).toBeInTheDocument();
    });

    it('should show empty state message when no fields', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText(/No fields defined/i)).toBeInTheDocument();
    });

    it('should render field list when fields exist', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });
  });

  describe('Adding Fields', () => {
    it('should call onAddField when form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const input = screen.getByTestId('new-field-input');
      const addButton = screen.getByTestId('add-field-button');

      await user.type(input, 'New Field');
      await user.click(addButton);

      expect(mockOnAddField).toHaveBeenCalledWith('New Field');
    });

    it('should clear input after adding field', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const input = screen.getByTestId('new-field-input') as HTMLInputElement;
      const addButton = screen.getByTestId('add-field-button');

      await user.type(input, 'New Field');
      await user.click(addButton);

      expect(input.value).toBe('');
    });

    it('should trim whitespace when adding field', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const input = screen.getByTestId('new-field-input');
      const addButton = screen.getByTestId('add-field-button');

      await user.type(input, '  New Field  ');
      await user.click(addButton);

      expect(mockOnAddField).toHaveBeenCalledWith('New Field');
    });

    it('should not call onAddField with empty name', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const addButton = screen.getByTestId('add-field-button');
      await user.click(addButton);

      expect(mockOnAddField).not.toHaveBeenCalled();
    });

    it('should not call onAddField with only whitespace', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const input = screen.getByTestId('new-field-input');
      const addButton = screen.getByTestId('add-field-button');

      await user.type(input, '   ');
      await user.click(addButton);

      expect(mockOnAddField).not.toHaveBeenCalled();
    });

    it('should disable add button when input is empty', () => {
      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const addButton = screen.getByTestId('add-field-button');
      expect(addButton).toBeDisabled();
    });

    it('should enable add button when input has value', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={[]}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const input = screen.getByTestId('new-field-input');
      const addButton = screen.getByTestId('add-field-button');

      await user.type(input, 'New Field');

      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Editing Fields', () => {
    it('should show edit input when rename button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      expect(editInput).toBeInTheDocument();
      expect(editInput).toHaveFocus();
    });

    it('should call onUpdateField when save button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      await user.clear(editInput);
      await user.type(editInput, 'Updated Field');

      // Find save button by its check icon within the editing section
      const saveButton = document.querySelector('.bi-check')?.closest('button');
      expect(saveButton).toBeTruthy();
      if (saveButton) {
        await user.click(saveButton);
        expect(mockOnUpdateField).toHaveBeenCalledWith('field1', 'Updated Field');
      }
    });

    it('should call onUpdateField when Enter key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      await user.clear(editInput);
      await user.type(editInput, 'Updated Field{Enter}');

      expect(mockOnUpdateField).toHaveBeenCalledWith('field1', 'Updated Field');
    });

    it('should cancel edit when Escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      await user.clear(editInput);
      await user.type(editInput, 'Updated Field{Escape}');

      expect(mockOnUpdateField).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('Updated Field')).not.toBeInTheDocument();
    });

    it('should cancel edit when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      await user.clear(editInput);
      await user.type(editInput, 'Updated Field');

      // Find cancel button by its x icon within the editing section
      const cancelButton = document.querySelector('.bi-x')?.closest('button');
      expect(cancelButton).toBeTruthy();
      if (cancelButton) {
        await user.click(cancelButton);
        expect(mockOnUpdateField).not.toHaveBeenCalled();
      }
    });

    it('should trim whitespace when updating field name', async () => {
      const user = userEvent.setup();

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const renameButton = screen.getAllByTitle('Rename field')[0];
      await user.click(renameButton);

      const editInput = screen.getByDisplayValue('Field 1');
      await user.clear(editInput);
      await user.type(editInput, '  Updated Field  {Enter}');

      expect(mockOnUpdateField).toHaveBeenCalledWith('field1', 'Updated Field');
    });
  });

  describe('Deleting Fields', () => {
    it('should call onDeleteField when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const deleteButton = screen.getAllByTitle('Delete field')[0];
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Delete field "Field 1"?');
      expect(mockOnDeleteField).toHaveBeenCalledWith('field1');

      confirmSpy.mockRestore();
    });

    it('should not call onDeleteField when deletion is cancelled', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const deleteButton = screen.getAllByTitle('Delete field')[0];
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnDeleteField).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should warn about unassigned games when deleting field with games', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const deleteButton = screen.getAllByTitle('Delete field')[0];
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Delete field "Field 1"? This will unassign 2 game(s) from this field.'
      );

      confirmSpy.mockRestore();
    });
  });

  describe('Game Count Display', () => {
    it('should display correct game count for each field', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('2 games')).toBeInTheDocument(); // Field 1
      expect(screen.getByText('1 game')).toBeInTheDocument(); // Field 2
    });

    it('should show singular "game" for single game', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('1 game')).toBeInTheDocument();
    });

    it('should show plural "games" for multiple games', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('2 games')).toBeInTheDocument();
    });

    it('should show 0 games for field with no games', () => {
      const fields = [{ id: 'field3', name: 'Field 3', order: 2 }];

      render(
        <FieldSidebar
          fields={fields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText('0 games')).toBeInTheDocument();
    });
  });

  describe('Unassigned Games Warning', () => {
    it('should show warning when games have no field assigned', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={sampleNodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText(/1 game has no field assigned/i)).toBeInTheDocument();
    });

    it('should show plural message for multiple unassigned games', () => {
      const nodes: FlowNode[] = [
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 1',
            fieldId: null,
            homeTeamId: null,
            awayTeamId: null,
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'game2',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 2',
            fieldId: null,
            homeTeamId: null,
            awayTeamId: null,
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={nodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByText(/2 games have no field assigned/i)).toBeInTheDocument();
    });

    it('should not show warning when all games have fields assigned', () => {
      const nodes: FlowNode[] = [
        {
          id: 'game1',
          type: 'game',
          parentId: 'stage1',
          data: {
            standing: 'Game 1',
            fieldId: 'field1',
            homeTeamId: null,
            awayTeamId: null,
            official: null,
            startTime: null,
          },
          position: { x: 0, y: 0 },
        },
      ];

      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={nodes}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.queryByText(/no field assigned/i)).not.toBeInTheDocument();
    });
  });

  describe('Field List Items', () => {
    it('should render field items with correct test IDs', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      expect(screen.getByTestId('field-item-field1')).toBeInTheDocument();
      expect(screen.getByTestId('field-item-field2')).toBeInTheDocument();
    });

    it('should display field icon for each field', () => {
      render(
        <FieldSidebar
          fields={sampleFields}
          nodes={[]}
          onAddField={mockOnAddField}
          onUpdateField={mockOnUpdateField}
          onDeleteField={mockOnDeleteField}
        />
      );

      const icons = document.querySelectorAll('.bi-geo-alt');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
