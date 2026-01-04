/**
 * Tests for FlowToolbar Component - Inline Add Button Pattern
 *
 * TDD RED Phase: Tests verifying that Add Field, Add Stage, and Add Game buttons
 * have been REMOVED from the toolbar as part of the inline add-button pattern.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlowToolbar, { type FlowToolbarProps } from '../FlowToolbar';

const defaultProps: FlowToolbarProps = {
  onImport: vi.fn(),
  onExport: vi.fn(),
  onClearAll: vi.fn(),
  hasNodes: false,
  canExport: false,
};

describe('FlowToolbar - Inline Add Button Pattern', () => {
  describe('Removed buttons (inline pattern)', () => {
    it('does NOT render Add Field button (moved inline to Fields section)', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.queryByTestId('add-field-button')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Field')).not.toBeInTheDocument();
    });

    it('does NOT render Add Stage button (moved inline to Field body)', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.queryByTestId('add-stage-button')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Stage')).not.toBeInTheDocument();
    });

    it('does NOT render Add Game button (moved inline to Stage body)', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.queryByTestId('add-game-button')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Game')).not.toBeInTheDocument();
    });
  });

  describe('Remaining toolbar buttons', () => {
    it('renders Import button', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.getByTestId('import-button')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('renders Export button', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('renders Clear All button', () => {
      render(<FlowToolbar {...defaultProps} />);

      expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('disables Export when canExport is false', () => {
      render(<FlowToolbar {...defaultProps} canExport={false} />);

      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toBeDisabled();
    });

    it('enables Export when canExport is true', () => {
      render(<FlowToolbar {...defaultProps} canExport={true} />);

      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).not.toBeDisabled();
    });

    it('disables Clear All when hasNodes is false', () => {
      render(<FlowToolbar {...defaultProps} hasNodes={false} />);

      const clearButton = screen.getByTestId('clear-all-button');
      expect(clearButton).toBeDisabled();
    });

    it('enables Clear All when hasNodes is true', () => {
      render(<FlowToolbar {...defaultProps} hasNodes={true} />);

      const clearButton = screen.getByTestId('clear-all-button');
      expect(clearButton).not.toBeDisabled();
    });
  });
});
