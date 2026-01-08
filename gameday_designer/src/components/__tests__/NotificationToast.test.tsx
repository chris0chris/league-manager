import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationToast from '../NotificationToast';
import { Notification } from '../../types/designer';

describe('NotificationToast', () => {
  const mockOnClose = vi.fn();

  const mockNotifications: Notification[] = [
    {
      id: '1',
      message: 'Test success message',
      type: 'success',
      show: true,
      title: 'Success Title'
    },
    {
      id: '2',
      message: 'Test error message',
      type: 'danger',
      show: true,
      title: 'Error Title'
    }
  ];

  it('should render notifications when provided', () => {
    render(<NotificationToast notifications={mockNotifications} onClose={mockOnClose} />);
    
    expect(screen.getByText('Test success message')).toBeInTheDocument();
    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationToast notifications={[mockNotifications[0]]} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('should use default titles if none provided', () => {
    const notificationsWithoutTitles: Notification[] = [
      { id: '3', message: 'No title danger', type: 'danger', show: true },
      { id: '4', message: 'No title success', type: 'success', show: true }
    ];
    
    render(<NotificationToast notifications={notificationsWithoutTitles} onClose={mockOnClose} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Notification')).toBeInTheDocument();
  });
});
