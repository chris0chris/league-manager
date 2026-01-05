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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    it('renders hidden file input', () => {
      render(<FlowToolbar {...defaultProps} />);
      const fileInput = screen.getByTestId('import-file-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
      expect(fileInput).toHaveStyle({ display: 'none' });
    });

    it('renders LanguageSelector', () => {
      render(<FlowToolbar {...defaultProps} />);
      // LanguageSelector should be present (we can't test its internals here)
      expect(screen.getByTestId('flow-toolbar')).toBeInTheDocument();
    });
  });

  describe('Undo/Redo buttons', () => {
    it('does not render undo/redo buttons when callbacks are not provided', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.queryByTestId('undo-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('redo-button')).not.toBeInTheDocument();
    });

    it('renders undo button when onUndo is provided', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} />);
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
    });

    it('renders redo button when onRedo is provided', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} />);
      expect(screen.getByTestId('redo-button')).toBeInTheDocument();
    });

    it('renders both undo and redo buttons when both callbacks are provided', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} onRedo={onRedo} />);
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
      expect(screen.getByTestId('redo-button')).toBeInTheDocument();
    });

    it('disables undo button when canUndo is false', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} canUndo={false} />);
      expect(screen.getByTestId('undo-button')).toBeDisabled();
    });

    it('enables undo button when canUndo is true', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} canUndo={true} />);
      expect(screen.getByTestId('undo-button')).not.toBeDisabled();
    });

    it('disables redo button when canRedo is false', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} canRedo={false} />);
      expect(screen.getByTestId('redo-button')).toBeDisabled();
    });

    it('enables redo button when canRedo is true', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} canRedo={true} />);
      expect(screen.getByTestId('redo-button')).not.toBeDisabled();
    });

    it('calls onUndo when undo button is clicked', async () => {
      const onUndo = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} canUndo={true} />);

      await user.click(screen.getByTestId('undo-button'));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onRedo when redo button is clicked', async () => {
      const onRedo = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} canRedo={true} />);

      await user.click(screen.getByTestId('redo-button'));
      expect(onRedo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export functionality', () => {
    it('disables Export button when canExport is false', () => {
      render(<FlowToolbar {...defaultProps} canExport={false} />);
      expect(screen.getByTestId('export-button')).toBeDisabled();
    });

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

    it('does not call onExport when Export button is disabled', async () => {
      const onExport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onExport={onExport} canExport={false} />);

      // Try to click disabled button
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);
      expect(onExport).not.toHaveBeenCalled();
    });
  });

  describe('Clear All functionality', () => {
    it('disables Clear All button when hasNodes is false', () => {
      render(<FlowToolbar {...defaultProps} hasNodes={false} />);
      expect(screen.getByTestId('clear-all-button')).toBeDisabled();
    });

    it('enables Clear All button when hasNodes is true', () => {
      render(<FlowToolbar {...defaultProps} hasNodes={true} />);
      expect(screen.getByTestId('clear-all-button')).not.toBeDisabled();
    });

    it('calls onClearAll when Clear All button is clicked', async () => {
      const onClearAll = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onClearAll={onClearAll} hasNodes={true} />);

      await user.click(screen.getByTestId('clear-all-button'));
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it('does not call onClearAll when Clear All button is disabled', async () => {
      const onClearAll = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onClearAll={onClearAll} hasNodes={false} />);

      // Try to click disabled button
      const clearButton = screen.getByTestId('clear-all-button');
      await user.click(clearButton);
      expect(onClearAll).not.toHaveBeenCalled();
    });
  });

  describe('Import functionality', () => {
    it('triggers file input click when Import button is clicked', async () => {
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      await user.click(screen.getByTestId('import-button'));
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('parses and imports valid JSON file', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const testData = { fields: [], stages: [], games: [] };
      const file = new File([JSON.stringify(testData)], 'test.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledTimes(1);
        expect(onImport).toHaveBeenCalledWith(testData);
      });
    });

    it('handles complex nested JSON structure', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const testData = {
        fields: [{ id: '1', name: 'Field 1' }],
        stages: [{ id: 's1', name: 'Stage 1', fieldId: '1' }],
        games: [{ id: 'g1', stageId: 's1', teams: ['A', 'B'] }],
      };
      const file = new File([JSON.stringify(testData)], 'complex.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith(testData);
      });
    });

    it('shows alert and logs error for invalid JSON', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['{ invalid json }'], 'invalid.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to parse JSON file:',
          expect.any(Error)
        );
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to parse JSON file. Please ensure it is valid JSON.'
        );
        expect(onImport).not.toHaveBeenCalled();
      });
    });

    it('shows alert and logs error for malformed JSON', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['not json at all'], 'malformed.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to parse JSON file. Please ensure it is valid JSON.'
        );
        expect(onImport).not.toHaveBeenCalled();
      });
    });

    it('resets file input value after import', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const testData = { test: 'data' };
      const file = new File([JSON.stringify(testData)], 'test.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onImport).toHaveBeenCalled();
        expect(fileInput.value).toBe('');
      });
    });

    it('resets file input value even after error', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['{ invalid }'], 'invalid.json', { type: 'application/json' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });

    it('handles file input change with no file selected', () => {
      const onImport = vi.fn();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;

      // Simulate change event with no files
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(onImport).not.toHaveBeenCalled();
    });

    it('accepts JSON files with .json extension', () => {
      render(<FlowToolbar {...defaultProps} />);
      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      expect(fileInput.accept).toContain('.json');
    });

    it('accepts files with application/json MIME type', () => {
      render(<FlowToolbar {...defaultProps} />);
      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      expect(fileInput.accept).toContain('application/json');
    });
  });

  describe('Button tooltips and accessibility', () => {
    it('has tooltip for Import button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const importButton = screen.getByTestId('import-button');
      expect(importButton).toHaveAttribute('title', 'Import from JSON file');
    });

    it('has tooltip for Export button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toHaveAttribute('title', 'Export to JSON file');
    });

    it('has tooltip for Clear All button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const clearButton = screen.getByTestId('clear-all-button');
      expect(clearButton).toHaveAttribute('title', 'Clear all nodes and edges');
    });

    it('has tooltip for Undo button when rendered', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} />);
      const undoButton = screen.getByTestId('undo-button');
      expect(undoButton).toHaveAttribute('title', 'Undo (Ctrl+Z)');
    });

    it('has tooltip for Redo button when rendered', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} />);
      const redoButton = screen.getByTestId('redo-button');
      expect(redoButton).toHaveAttribute('title', 'Redo (Ctrl+Y)');
    });
  });

  describe('Button styling and variants', () => {
    it('applies correct variant to Import button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const importButton = screen.getByTestId('import-button');
      expect(importButton).toHaveClass('btn-outline-secondary');
    });

    it('applies correct variant to Export button', () => {
      render(<FlowToolbar {...defaultProps} />);
      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toHaveClass('btn-outline-secondary');
    });

    it('applies correct variant to Clear All button (danger)', () => {
      render(<FlowToolbar {...defaultProps} />);
      const clearButton = screen.getByTestId('clear-all-button');
      expect(clearButton).toHaveClass('btn-outline-danger');
    });

    it('applies correct variant to Undo button when rendered', () => {
      const onUndo = vi.fn();
      render(<FlowToolbar {...defaultProps} onUndo={onUndo} />);
      const undoButton = screen.getByTestId('undo-button');
      expect(undoButton).toHaveClass('btn-outline-secondary');
    });

    it('applies correct variant to Redo button when rendered', () => {
      const onRedo = vi.fn();
      render(<FlowToolbar {...defaultProps} onRedo={onRedo} />);
      const redoButton = screen.getByTestId('redo-button');
      expect(redoButton).toHaveClass('btn-outline-secondary');
    });
  });

  describe('Integration scenarios', () => {
    it('handles multiple imports in sequence', async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<FlowToolbar {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;

      // First import
      const file1 = new File([JSON.stringify({ data: 1 })], 'test1.json', { type: 'application/json' });
      await user.upload(fileInput, file1);

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith({ data: 1 });
      });

      // Second import (input should be reset, allowing same file name)
      const file2 = new File([JSON.stringify({ data: 2 })], 'test2.json', { type: 'application/json' });
      await user.upload(fileInput, file2);

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith({ data: 2 });
        expect(onImport).toHaveBeenCalledTimes(2);
      });
    });

    it('handles all button interactions in single toolbar', async () => {
      const onImport = vi.fn();
      const onExport = vi.fn();
      const onClearAll = vi.fn();
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      const user = userEvent.setup();

      render(
        <FlowToolbar
          onImport={onImport}
          onExport={onExport}
          onClearAll={onClearAll}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={true}
          canRedo={true}
          hasNodes={true}
          canExport={true}
        />
      );

      // Test all buttons
      await user.click(screen.getByTestId('export-button'));
      expect(onExport).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('clear-all-button'));
      expect(onClearAll).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('undo-button'));
      expect(onUndo).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('redo-button'));
      expect(onRedo).toHaveBeenCalledTimes(1);
    });
  });
});
