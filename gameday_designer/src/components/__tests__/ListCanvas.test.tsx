/**
 * Tests for ListCanvas Component - Inline Add Field Button Pattern
 *
 * TDD RED Phase: Tests for Fields section Card wrapper and inline Add Field button.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListCanvas from '../ListCanvas';
import type { ListCanvasProps } from '../ListCanvas';
import type { FieldNode, StageNode, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';

// Helper function to create default props
const createDefaultProps = (overrides: Partial<ListCanvasProps> = {}): ListCanvasProps => ({
  nodes: [],
  edges: [],
  globalTeams: [],
  globalTeamGroups: [],
  onUpdateNode: vi.fn(),
  onDeleteNode: vi.fn(),
  onAddStage: vi.fn(),
  onSelectNode: vi.fn(),
  selectedNodeId: null,
  onAddGlobalTeam: vi.fn(),
  onUpdateGlobalTeam: vi.fn(),
  onDeleteGlobalTeam: vi.fn(),
  onReorderGlobalTeam: vi.fn(),
  onAddGlobalTeamGroup: vi.fn(),
  onUpdateGlobalTeamGroup: vi.fn(),
  onDeleteGlobalTeamGroup: vi.fn(),
  onReorderGlobalTeamGroup: vi.fn(),
  getTeamUsage: vi.fn(() => []),
  onAssignTeam: vi.fn(),
  onAddGame: vi.fn(),
  onAddField: vi.fn(),
  highlightedSourceGameId: null,
  onDynamicReferenceClick: vi.fn(),
  onAddGameToGameEdge: vi.fn(),
  onRemoveGameToGameEdge: vi.fn(),
  expandedFieldIds: new Set(),
  expandedStageIds: new Set(),
  ...overrides,
});

describe('ListCanvas - Inline Add Field Button Pattern', () => {
  describe('Fields section Card wrapper', () => {
    it('renders Fields section with Card wrapper and header', () => {
      render(<ListCanvas {...createDefaultProps()} />);

      // Should have Fields section header
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });

    it('Fields header has icon', () => {
      const { container } = render(<ListCanvas {...createDefaultProps()} />);

      const fieldsHeader = screen.getByText('Fields').closest('.card-header');
      expect(fieldsHeader).toBeInTheDocument();

      // Check for icon (bi-geo-alt-fill)
      const icon = fieldsHeader?.querySelector('.bi-geo-alt-fill');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty state - no fields', () => {
    it('shows empty state when there are no fields', () => {
      render(<ListCanvas {...createDefaultProps()} />);

      expect(screen.getByText('No fields yet')).toBeInTheDocument();
      expect(screen.getByText(/create your first field/i)).toBeInTheDocument();
    });

    it('shows centered Add Field button in empty state', () => {
      render(<ListCanvas {...createDefaultProps()} />);

      const addButton = screen.getByRole('button', { name: /add field/i });
      expect(addButton).toBeInTheDocument();
    });

    it('calls onAddField when empty state button is clicked', () => {
      const onAddField = vi.fn();
      render(<ListCanvas {...createDefaultProps({ onAddField })} />);

      const addButton = screen.getByRole('button', { name: /add field/i });
      fireEvent.click(addButton);

      expect(onAddField).toHaveBeenCalledTimes(1);
    });

    it('empty state has large icon', () => {
      const { container } = render(<ListCanvas {...createDefaultProps()} />);

      const icon = container.querySelector('.bi-geo-alt');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveStyle({ fontSize: '4rem' });
    });
  });

  describe('Fields grid with inline Add Field card', () => {
    const sampleField: FieldNode = {
      id: 'field-1',
      type: 'field',
      position: { x: 0, y: 0 },
      data: {
        type: 'field',
        name: 'Field 1',
        order: 0,
      },
    };

    it('renders fields grid when fields exist', () => {
      const { container } = render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField],
          })}
        />
      );

      const grid = container.querySelector('.fields-grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders Add Field card at end of grid', () => {
      render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField],
          })}
        />
      );

      // Should render the field
      expect(screen.getByText('Field 1')).toBeInTheDocument();

      // Should render Add Field button/card at end
      const addButtons = screen.getAllByRole('button', { name: /add field/i });
      // There should be at least one Add Field button (the card one)
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('Add Field card has centered button', () => {
      const { container } = render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField],
          })}
        />
      );

      // Find the Add Field card (should have field-section class and be a card)
      const addFieldCards = container.querySelectorAll('.field-section');
      // The last one should be the Add Field card
      const addFieldCard = Array.from(addFieldCards).find((card) => {
        const button = card.querySelector('button');
        return button?.textContent?.includes('Add Field');
      });

      expect(addFieldCard).toBeInTheDocument();
    });

    it('calls onAddField when grid Add Field card button is clicked', () => {
      const onAddField = vi.fn();
      render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField],
            onAddField,
          })}
        />
      );

      // Find all Add Field buttons (could be multiple - in card, in empty stage, etc.)
      const addButtons = screen.getAllByRole('button', { name: /add field/i });

      // Click the first one (should be the card button)
      fireEvent.click(addButtons[0]);

      expect(onAddField).toHaveBeenCalledTimes(1);
    });

    it('Add Field card has minimum height styling', () => {
      const { container } = render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField],
          })}
        />
      );

      const addFieldCards = container.querySelectorAll('.field-section');
      const addFieldCard = Array.from(addFieldCards).find((card) => {
        const button = card.querySelector('button');
        return button?.textContent?.includes('Add Field');
      });

      expect(addFieldCard).toHaveStyle({ minHeight: '150px' });
    });

    it('renders multiple fields in grid order', () => {
      const field2: FieldNode = {
        id: 'field-2',
        type: 'field',
        position: { x: 0, y: 0 },
        data: {
          type: 'field',
          name: 'Field 2',
          order: 1,
        },
      };

      render(
        <ListCanvas
          {...createDefaultProps({
            nodes: [sampleField, field2],
          })}
        />
      );

      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });
  });

  describe('Global Team Pool section', () => {
    it('always renders Global Team Pool section', () => {
      render(<ListCanvas {...createDefaultProps()} />);

      expect(screen.getByText('Global Team Pool')).toBeInTheDocument();
    });

    it('Global Team Pool appears before Fields section', () => {
      const { container } = render(<ListCanvas {...createDefaultProps()} />);

      const sections = container.querySelectorAll('.card');
      const sectionTexts = Array.from(sections).map((s) => s.textContent);

      // Global Team Pool should come before Fields
      const teamPoolIndex = sectionTexts.findIndex((t) => t?.includes('Global Team Pool'));
      const fieldsIndex = sectionTexts.findIndex((t) => t?.includes('Fields'));

      expect(teamPoolIndex).toBeGreaterThanOrEqual(0);
      expect(fieldsIndex).toBeGreaterThanOrEqual(0);
      expect(teamPoolIndex).toBeLessThan(fieldsIndex);
    });
  });
});
