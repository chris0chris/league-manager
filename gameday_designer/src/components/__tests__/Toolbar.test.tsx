/**
 * Tests for Toolbar component
 *
 * The Toolbar provides:
 * - Add Field button
 * - Import JSON button (file input)
 * - Export JSON button (download)
 * - Clear All button (with confirm)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from '../Toolbar';

describe('Toolbar', () => {
  const mockOnAddField = vi.fn();
  const mockOnImport = vi.fn();
  const mockOnExport = vi.fn();
  const mockOnClearAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderToolbar = () => {
    return render(
      <Toolbar
        onAddField={mockOnAddField}
        onImport={mockOnImport}
        onExport={mockOnExport}
        onClearAll={mockOnClearAll}
      />
    );
  };

  describe('Add Field button', () => {
    it('renders Add Field button', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /add field/i })).toBeInTheDocument();
    });

    it('calls onAddField when Add Field button is clicked', async () => {
      const user = userEvent.setup();
      renderToolbar();

      await user.click(screen.getByRole('button', { name: /add field/i }));

      expect(mockOnAddField).toHaveBeenCalledTimes(1);
    });
  });

  describe('Import button', () => {
    it('renders Import button', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    });

    it('has a hidden file input for importing JSON', () => {
      renderToolbar();
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
    });

    it('calls onImport with parsed JSON when valid file is selected', async () => {
      renderToolbar();

      const validJson = [
        {
          field: 'Feld 1',
          games: [
            {
              stage: 'Vorrunde',
              standing: 'Gruppe 1',
              home: '0_0',
              away: '0_1',
              official: '0_2',
            },
          ],
        },
      ];

      const file = new File([JSON.stringify(validJson)], 'schedule.json', {
        type: 'application/json',
      });

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      // Use Object.defineProperty to mock the files property
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      // Trigger change event - jsdom will use the real FileReader
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(validJson);
      });
    });

    it('shows error when invalid JSON file is selected', async () => {
      renderToolbar();

      const file = new File(['invalid json'], 'bad.json', {
        type: 'application/json',
      });

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockOnImport).not.toHaveBeenCalled();
    });
  });

  describe('Export button', () => {
    it('renders Export button', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('calls onExport when Export button is clicked', async () => {
      const user = userEvent.setup();
      renderToolbar();

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear All button', () => {
    it('renders Clear All button', () => {
      renderToolbar();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('shows confirmation dialog when Clear All is clicked', async () => {
      const user = userEvent.setup();
      renderToolbar();

      await user.click(screen.getByRole('button', { name: /clear all/i }));

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('calls onClearAll when confirmed', async () => {
      const user = userEvent.setup();
      renderToolbar();

      await user.click(screen.getByRole('button', { name: /clear all/i }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockOnClearAll).toHaveBeenCalledTimes(1);
    });

    it('does not call onClearAll when cancelled', async () => {
      const user = userEvent.setup();
      renderToolbar();

      await user.click(screen.getByRole('button', { name: /clear all/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClearAll).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has accessible labels for all buttons', () => {
      renderToolbar();

      expect(screen.getByRole('button', { name: /add field/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });
  });
});
