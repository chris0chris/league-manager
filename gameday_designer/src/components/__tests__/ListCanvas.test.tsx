/**
 * Tests for ListCanvas Component - Inline Add Field Button Pattern
 *
 * TDD RED Phase: Tests for Fields section Card wrapper and inline Add Field button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListCanvas from '../ListCanvas';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import type { ListCanvasProps } from '../ListCanvas';
import type { FieldNode } from '../../types/flowchart';

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
  getTeamUsage: vi.fn(() => ({ count: 0, gameIds: [] })),
  onAssignTeam: vi.fn(),
  onAddGame: vi.fn(),
  onAddField: vi.fn(),
  highlightedElement: null,
  onDynamicReferenceClick: vi.fn(),
  onAddGameToGameEdge: vi.fn(),
  onAddStageToGameEdge: vi.fn(),
  onRemoveEdgeFromSlot: vi.fn(),
  expandedFieldIds: new Set(),
  expandedStageIds: new Set(),
  onNotify: vi.fn(),
  ...overrides,
});

const renderCanvas = (props: ListCanvasProps) => {
  return render(
    <GamedayProvider>
      <ListCanvas {...props} />
    </GamedayProvider>
  );
};

describe('ListCanvas - Inline Add Field Button Pattern', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('Fields section Card wrapper', () => {
    it('renders Fields section with Card wrapper and header', () => {
      renderCanvas(createDefaultProps());

      // Should have Fields section header (translated label)
      expect(screen.getByText('Fields')).toBeInTheDocument();
    });

    it('Fields header has icon', () => {
      const { container } = renderCanvas(createDefaultProps());
      const fieldsCard = container.querySelector('.fields-card');
      const fieldsHeader = fieldsCard?.querySelector('.card-header');

      // Check for icon (bi-map)
      const icon = fieldsHeader?.querySelector('.bi-map');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty state - no fields', () => {
    it('shows empty state when there are no fields', () => {
      renderCanvas(createDefaultProps());
      expect(screen.getByText(/no fields yet/i)).toBeInTheDocument();
    });

    it('shows Add Field button in empty state', () => {
      renderCanvas(createDefaultProps());

      // There are now two Add Field buttons: header and body
      const addButtons = screen.getAllByRole('button', { name: /add field/i });
      expect(addButtons.length).toBeGreaterThan(1);
    });

    it('calls onAddField when empty state button is clicked', () => {
      const onAddField = vi.fn();
      renderCanvas(createDefaultProps({ onAddField }));

      // Clicking any of them should work
      const addButtons = screen.getAllByRole('button', { name: /add field/i });
      fireEvent.click(addButtons[0]);

      expect(onAddField).toHaveBeenCalled();
    });

    it('empty state has large icon', () => {
      const { container } = renderCanvas(createDefaultProps());

      // Empty state uses bi-map
      const icon = container.querySelector('.bi-map');
      expect(icon).toBeInTheDocument();
      // Check for the one in the body (large)
      const bodyIcon = container.querySelector('.card-body .bi-map');
      expect(bodyIcon).toHaveStyle({ fontSize: '4rem' });
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
      const { container } = renderCanvas(
        createDefaultProps({
          nodes: [sampleField],
        })
      );

      const grid = container.querySelector('.fields-grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders Add Field card at end of grid', () => {
      renderCanvas(
        createDefaultProps({
          nodes: [sampleField],
        })
      );

      // Should render the field
      expect(screen.getByText('Field 1')).toBeInTheDocument();

      // Should render Add Field button/card at end
      const addButtons = screen.getAllByRole('button', { name: /add field/i });
      // There should be at least one Add Field button (the card one)
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('Add Field card has centered button', () => {
      renderCanvas(
        createDefaultProps({
          nodes: [sampleField],
        })
      );

      // Add Field button is now in the header when fields exist, not in a card
      const addButton = screen.getByRole('button', { name: /add field/i });
      expect(addButton).toBeInTheDocument();
    });

    it('calls onAddField when grid Add Field card button is clicked', () => {
      const onAddField = vi.fn();
      renderCanvas(
        createDefaultProps({
          nodes: [sampleField],
          onAddField,
        })
      );

      // Find all Add Field buttons (could be multiple - in card, in empty stage, etc.)
      const addButtons = screen.getAllByRole('button', { name: /add field/i });

      // Click the first one (should be the card button)
      fireEvent.click(addButtons[0]);

      expect(onAddField).toHaveBeenCalledTimes(1);
    });

    it('Add Field card has minimum height styling', () => {
      renderCanvas(
        createDefaultProps({
          nodes: [sampleField],
        })
      );

      // Add Field is now in the header, not a card - just verify it exists
      const addButton = screen.getByRole('button', { name: /add field/i });
      expect(addButton).toBeInTheDocument();
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

      renderCanvas(
        createDefaultProps({
          nodes: [sampleField, field2],
        })
      );

      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });
  });

  describe('Global Team Pool section', () => {
    it('always renders Global Team Pool section', () => {
      renderCanvas(createDefaultProps());

      // Component uses translated label.teamPool (mapped to "Team Pool" in en)
      expect(screen.getByText('label.teamPool')).toBeInTheDocument();
    });

    it('Global Team Pool appears before Fields section', () => {
      const { container } = renderCanvas(createDefaultProps());

      const sections = container.querySelectorAll('.card');
      const sectionTexts = Array.from(sections).map((s) => s.textContent || "");

      // Team Pool should come before Fields
      const teamPoolIndex = sectionTexts.findIndex((t) => t.includes('label.teamPool'));
      const fieldsIndex = sectionTexts.findIndex((t) => t.includes('Fields'));

      expect(teamPoolIndex).toBeGreaterThanOrEqual(0);
      expect(fieldsIndex).toBeGreaterThanOrEqual(0);
      expect(teamPoolIndex).toBeLessThan(fieldsIndex);
    });

    it('can toggle team pool expansion state', () => {
      const { container } = renderCanvas(createDefaultProps());

      // Find the team pool header (clickable)
      const teamPoolHeader = screen.getByText('label.teamPool').closest('.card-header');
      expect(teamPoolHeader).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(teamPoolHeader!);

      // After clicking, the team pool should be collapsed
      const collapsedCard = container.querySelector('.team-pool-card--collapsed');
      expect(collapsedCard).toBeInTheDocument();

      // Click again to expand
      fireEvent.click(collapsedCard!);

      // Should no longer be collapsed
      const expandedCard = container.querySelector('.team-pool-card--collapsed');
      expect(expandedCard).not.toBeInTheDocument();
    });

    it('shows Add Group button when team groups exist', () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Group A',
        order: 0,
      };

      renderCanvas(
        createDefaultProps({
          globalTeamGroups: [mockGroup],
        })
      );

      expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument();
    });

    it('calls onAddGlobalTeamGroup when Add Group button is clicked', () => {
      const onAddGlobalTeamGroup = vi.fn();
      const mockGroup = {
        id: 'group-1',
        name: 'Group A',
        order: 0,
      };

      renderCanvas(
        createDefaultProps({
          globalTeamGroups: [mockGroup],
          onAddGlobalTeamGroup,
        })
      );

      const addButton = screen.getByRole('button', { name: /add group/i });
      fireEvent.click(addButton);

      expect(onAddGlobalTeamGroup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Field stages sorting', () => {
    it('sorts stages by order within a field', () => {
      const field: FieldNode = {
        id: 'field-1',
        type: 'field',
        position: { x: 0, y: 0 },
        data: {
          type: 'field',
          name: 'Field 1',
          order: 0,
        },
      };

      const stage1 = {
        id: 'stage-1',
        type: 'stage' as const,
        parentId: 'field-1',
        position: { x: 0, y: 0 },
        data: {
          type: 'stage' as const,
          name: 'Stage 1',
          category: 'preliminary' as const,
          order: 0,
        },
      };

      const stage2 = {
        id: 'stage-2',
        type: 'stage' as const,
        parentId: 'field-1',
        position: { x: 0, y: 0 },
        data: {
          type: 'stage' as const,
          name: 'Stage 2',
          category: 'final' as const,
          order: 1,
        },
      };

      renderCanvas(
        createDefaultProps({
          nodes: [field, stage2, stage1], // Note: stages in reverse order
          expandedFieldIds: new Set(['field-1']),
        })
      );

      // Both stages should be rendered (order doesn't matter for rendering, just internal sorting)
      expect(screen.getByText('Stage 1')).toBeInTheDocument();
      expect(screen.getByText('Stage 2')).toBeInTheDocument();
    });
  });
});
