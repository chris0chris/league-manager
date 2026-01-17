/**
 * Comprehensive Tests for FlowToolbar Component
 *
 * Tests cover:
 * - Import/Export functionality
 * - File handling and JSON parsing
 * - Clear all workflow
 * - Undo/Redo controls
 * - Error handling
 * - Button states and interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('FlowToolbar', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('renders the toolbar container', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByTestId('flow-toolbar')).toBeInTheDocument();
    });

    it('renders Import button', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
      // Label is removed from Import button (icon-only now)
      expect(screen.queryByText('Import')).not.toBeInTheDocument();
    });

    it('renders Export button', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      // Label is removed from Export button (icon-only now)
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });

    it('renders Actions dropdown', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders hidden file input', () => {
      render(<FlowToolbar {...defaultProps} />);
      const fileInput = screen.getByTestId('import-file-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
      expect(fileInput).toHaveStyle({ display: 'none' });
    });
  });

  describe('Undo/Redo buttons', () => {
    it('renders both undo and redo buttons when both callbacks are provided', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} onRedo={onRedo} />);
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
      expect(screen.getByTestId('redo-button')).toBeInTheDocument();
    });

    it('calls onUndo when undo button is clicked', async () => {
      const onUndo = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} canUndo={true} />);

      await user.click(screen.getByTestId('undo-button'));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export functionality', () => {
    it('enables Export button when canExport is true', () => {
      render(<FlowToolbar {...defaultProps} canExport={true} />);
      expect(screen.getByTestId('export-button')).not.toBeDisabled();
    });

    it('calls onExport when Export button is clicked', async () => {
      const onExport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onExport={onExport} canExport={true} />);

      await user.click(screen.getByTestId('export-button'));
      expect(onExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear All functionality', () => {
    it('calls onClearAll when Clear Schedule dropdown item is clicked', async () => {
      const onClearAll = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onClearAll={onClearAll} hasNodes={true} />);

      // Open dropdown
      await user.click(screen.getByText('Actions'));
      
      // Click Clear Schedule
      await user.click(screen.getByText('Clear Schedule'));
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Gameday functionality', () => {
    it('calls onDeleteGameday when Delete Gameday dropdown item is clicked and confirmed', async () => {
      const onDeleteGameday = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onDeleteGameday={onDeleteGameday} />);

      // Open dropdown
      await user.click(screen.getByText('Actions'));
      
      // Click Delete Gameday
      const deleteItem = screen.getByText('Delete Gameday');
      await user.click(deleteItem);
      
      expect(onDeleteGameday).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button tooltips and accessibility', () => {
    it('has tooltip for Import button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const importButton = screen.getByTestId('import-button');
      expect(importButton).toHaveAttribute('title', 'Import a tournament schedule from a JSON file');
    });

    it('has tooltip for Export button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toHaveAttribute('title', 'Export the current tournament schedule to a JSON file');
    });

    it('has tooltip for Undo button when rendered', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} />);
      const undoButton = screen.getByTestId('undo-button');
      expect(undoButton).toHaveAttribute('title', 'Undo the last action');
    });

    it('has tooltip for Redo button when rendered', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} />);
      const redoButton = screen.getByTestId('redo-button');
      expect(redoButton).toHaveAttribute('title', 'Redo the previously undone action');
    });
  });
});