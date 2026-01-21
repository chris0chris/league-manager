/**
 * Additional coverage tests for NotificationToast
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationToast from '../NotificationToast';
import { Notification } from '../../types/designer';

describe('NotificationToast Coverage', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders progress bar for notifications with undoAction', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Test Message',
        type: 'success',
        show: true,
        undoAction: vi.fn(),
        duration: 5000,
      },
    ];

    render(<NotificationToast notifications={notifications} onClose={mockOnClose} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const val = parseInt(screen.getByRole('progressbar').getAttribute('aria-valuenow')!);
    expect(val).toBeLessThan(100);
    expect(val).toBeGreaterThan(0);

    act(() => {
        vi.advanceTimersByTime(2501);
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles undo button click with custom label', () => {
    const undoAction = vi.fn();
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Test Message',
        type: 'info',
        show: true,
        undoAction: undoAction,
        undoLabel: 'Restore',
      },
    ];

    render(<NotificationToast notifications={notifications} onClose={mockOnClose} />);
    
    const undoBtn = screen.getByRole('button', { name: /Restore/i });
    fireEvent.click(undoBtn);
    
    expect(undoAction).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('handles undo button click with default label', () => {
    const undoAction = vi.fn();
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Test Message',
        type: 'warning',
        show: true,
        undoAction: undoAction,
      },
    ];

    render(<NotificationToast notifications={notifications} onClose={mockOnClose} />);
    
    const undoBtn = screen.getByRole('button', { name: /Undo/i });
    fireEvent.click(undoBtn);
    
    expect(undoAction).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('does not render progress bar if no undoAction', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        message: 'Test Message',
        type: 'danger',
        show: true,
      },
    ];

    render(<NotificationToast notifications={notifications} onClose={mockOnClose} />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
