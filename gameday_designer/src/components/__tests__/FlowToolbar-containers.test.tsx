/**
 * Tests for FlowToolbar Component - Inline Add Button Pattern
 *
 * TDD RED Phase: Tests verifying that Add Field, Add Stage, and Add Game buttons
 * have been REMOVED from the toolbar as part of the inline add-button pattern.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      render(<FlowToolbar {...defaultProps} hasNodes={true} />);

      expect(screen.getByTestId('import-button')).toBeInTheDocument();
      // Label is removed from Import button (icon-only now)
      expect(screen.queryByText('Import')).not.toBeInTheDocument();
    });

    it('renders Export button', () => {
      render(<FlowToolbar {...defaultProps} canExport={true} />);

      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      // Label is removed from Export button (icon-only now)
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });

    it('renders Clear Schedule item in dropdown', async () => {
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} hasNodes={true} />);

      // Open dropdown
      await user.click(screen.getByText('Actions'));
      
      expect(screen.getByText('Clear Schedule')).toBeInTheDocument();
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

    it('disables Clear Schedule item when hasNodes is false', async () => {
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} hasNodes={false} />);

      await user.click(screen.getByText('Actions'));
      
      const clearItem = screen.getByText('Clear Schedule').closest('.dropdown-item');
      expect(clearItem).toHaveClass('disabled');
    });

    it('enables Clear Schedule item when hasNodes is true', async () => {
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} hasNodes={true} />);

      await user.click(screen.getByText('Actions'));
      
      const clearItem = screen.getByText('Clear Schedule').closest('.dropdown-item');
      expect(clearItem).not.toHaveClass('disabled');
    });
  });
});
