/**
 * Tests for ValidationPanel component
 *
 * ValidationPanel displays validation errors and warnings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValidationPanel from '../ValidationPanel';
import type { ValidationResult } from '../../types/designer';

describe('ValidationPanel', () => {
  const mockOnNavigateToSlot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPanel = (result: ValidationResult = { isValid: true, errors: [], warnings: [] }) => {
    return render(
      <ValidationPanel
        result={result}
        onNavigateToSlot={mockOnNavigateToSlot}
      />
    );
  };

  describe('valid state', () => {
    it('shows success message when valid and no warnings', () => {
      renderPanel({ isValid: true, errors: [], warnings: [] });
      expect(screen.getByText(/schedule is valid/i)).toBeInTheDocument();
    });
  });

  describe('errors display', () => {
    it('shows error count in header', () => {
      renderPanel({
        isValid: false,
        errors: [
          {
            id: 'err-1',
            type: 'official_playing',
            message: 'Team cannot officiate own game',
            affectedSlots: ['slot-1'],
          },
        ],
        warnings: [],
      });

      expect(screen.getByText(/1 error/i)).toBeInTheDocument();
    });

    it('displays error messages', () => {
      renderPanel({
        isValid: false,
        errors: [
          {
            id: 'err-1',
            type: 'official_playing',
            message: 'Team cannot officiate own game',
            affectedSlots: ['slot-1'],
          },
        ],
        warnings: [],
      });

      expect(screen.getByText(/Team cannot officiate own game/i)).toBeInTheDocument();
    });

    it('shows multiple errors', () => {
      renderPanel({
        isValid: false,
        errors: [
          {
            id: 'err-1',
            type: 'official_playing',
            message: 'Error 1',
            affectedSlots: ['slot-1'],
          },
          {
            id: 'err-2',
            type: 'invalid_reference',
            message: 'Error 2',
            affectedSlots: ['slot-2'],
          },
        ],
        warnings: [],
      });

      expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    });

    it('allows clicking on error to navigate to affected slot', async () => {
      const user = userEvent.setup();
      renderPanel({
        isValid: false,
        errors: [
          {
            id: 'err-1',
            type: 'official_playing',
            message: 'Team cannot officiate own game',
            affectedSlots: ['slot-1'],
          },
        ],
        warnings: [],
      });

      const errorItem = screen.getByText(/Team cannot officiate own game/i);
      await user.click(errorItem);

      expect(mockOnNavigateToSlot).toHaveBeenCalledWith('slot-1');
    });
  });

  describe('warnings display', () => {
    it('shows warning count in header', () => {
      renderPanel({
        isValid: true,
        errors: [],
        warnings: [
          {
            id: 'warn-1',
            type: 'duplicate_standing',
            message: 'Duplicate standing detected',
            affectedSlots: ['slot-1', 'slot-2'],
          },
        ],
      });

      expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
    });

    it('displays warning messages', () => {
      renderPanel({
        isValid: true,
        errors: [],
        warnings: [
          {
            id: 'warn-1',
            type: 'duplicate_standing',
            message: 'Duplicate standing detected',
            affectedSlots: ['slot-1', 'slot-2'],
          },
        ],
      });

      expect(screen.getByText(/Duplicate standing detected/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows no issues when no errors and no warnings', () => {
      renderPanel({ isValid: true, errors: [], warnings: [] });
      expect(screen.getByText(/schedule is valid/i)).toBeInTheDocument();
    });
  });
});
