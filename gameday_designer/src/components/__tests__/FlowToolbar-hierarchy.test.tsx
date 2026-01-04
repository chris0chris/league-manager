/**
 * Tests for FlowToolbar Component - Container Hierarchy Awareness
 *
 * TDD RED Phase: Tests for container-aware toolbar behavior:
 * - Add Team button shows tooltip indicating target stage
 * - Add Game button shows tooltip indicating target stage
 * - Buttons indicate when containers will be auto-created
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlowToolbar, { type FlowToolbarProps } from '../FlowToolbar';

const defaultProps: FlowToolbarProps = {
  onAddTeam: vi.fn(),
  onAddGame: vi.fn(),
  onAddField: vi.fn(),
  onAddStage: vi.fn(),
  onImport: vi.fn(),
  onExport: vi.fn(),
  onClearAll: vi.fn(),
  hasNodes: false,
  canExport: false,
  canAddStage: false,
};

describe('FlowToolbar - Container Hierarchy Awareness', () => {
  describe('Add Team button with target stage info', () => {
    it('shows tooltip indicating auto-creation when no stage selected', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName={null}
          targetFieldName={null}
        />
      );

      const button = screen.getByTestId('add-team-button');
      expect(button).toHaveAttribute(
        'title',
        expect.stringContaining('new Field')
      );
    });

    it('shows tooltip with target stage name when stage is selected', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName="Vorrunde"
          targetFieldName="Feld 1"
        />
      );

      const button = screen.getByTestId('add-team-button');
      expect(button).toHaveAttribute(
        'title',
        expect.stringContaining('Vorrunde')
      );
    });

    it('shows tooltip with target field when field selected but no stage', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName={null}
          targetFieldName="Feld 1"
          hasSelectedField={true}
        />
      );

      const button = screen.getByTestId('add-team-button');
      expect(button).toHaveAttribute(
        'title',
        expect.stringContaining('Feld 1')
      );
    });
  });

  describe('Add Game button with target stage info', () => {
    it('shows tooltip indicating auto-creation when no stage selected', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName={null}
          targetFieldName={null}
        />
      );

      const button = screen.getByTestId('add-game-button');
      expect(button).toHaveAttribute(
        'title',
        expect.stringContaining('new Field')
      );
    });

    it('shows tooltip with target stage name when stage is selected', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName="Finalrunde"
          targetFieldName="Main Field"
        />
      );

      const button = screen.getByTestId('add-game-button');
      expect(button).toHaveAttribute(
        'title',
        expect.stringContaining('Finalrunde')
      );
    });
  });

  describe('Visual feedback for target container', () => {
    it('displays target stage badge when stage available', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName="Vorrunde"
          targetFieldName="Feld 1"
          showTargetBadge={true}
        />
      );

      // Look for a badge or indicator showing target stage
      const badge = screen.queryByTestId('target-stage-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Vorrunde');
    });

    it('displays auto-create indicator when no containers exist', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName={null}
          targetFieldName={null}
          showTargetBadge={true}
        />
      );

      // Look for indicator that containers will be created
      const indicator = screen.queryByTestId('auto-create-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('hides badge when showTargetBadge is false', () => {
      render(
        <FlowToolbar
          {...defaultProps}
          targetStageName="Vorrunde"
          targetFieldName="Feld 1"
          showTargetBadge={false}
        />
      );

      const badge = screen.queryByTestId('target-stage-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Button callbacks still work correctly', () => {
    it('calls onAddTeam regardless of container state', () => {
      const onAddTeam = vi.fn();
      render(
        <FlowToolbar
          {...defaultProps}
          onAddTeam={onAddTeam}
          targetStageName={null}
        />
      );

      fireEvent.click(screen.getByTestId('add-team-button'));

      expect(onAddTeam).toHaveBeenCalledTimes(1);
    });

    it('calls onAddGame regardless of container state', () => {
      const onAddGame = vi.fn();
      render(
        <FlowToolbar
          {...defaultProps}
          onAddGame={onAddGame}
          targetStageName={null}
        />
      );

      fireEvent.click(screen.getByTestId('add-game-button'));

      expect(onAddGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard shortcuts remain functional', () => {
    it('Add Team button shows Ctrl+T shortcut in title', () => {
      render(<FlowToolbar {...defaultProps} targetStageName="Vorrunde" />);

      const button = screen.getByTestId('add-team-button');
      expect(button).toHaveAttribute('title', expect.stringContaining('Ctrl+T'));
    });

    it('Add Game button shows Ctrl+G shortcut in title', () => {
      render(<FlowToolbar {...defaultProps} targetStageName="Vorrunde" />);

      const button = screen.getByTestId('add-game-button');
      expect(button).toHaveAttribute('title', expect.stringContaining('Ctrl+G'));
    });
  });
});
