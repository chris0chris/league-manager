import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteGamedayConfirmModal from '../DeleteGamedayConfirmModal';
import '../../../i18n/testConfig';

describe('DeleteGamedayConfirmModal', () => {
  it('renders nothing when show is false', () => {
    render(
      <DeleteGamedayConfirmModal show={false} onHide={vi.fn()} onConfirm={vi.fn()} gamedayName="Test Day" />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the gameday name in the confirmation message', () => {
    render(
      <DeleteGamedayConfirmModal show={true} onHide={vi.fn()} onConfirm={vi.fn()} gamedayName="My Tournament" />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/My Tournament/)).toBeInTheDocument();
  });

  it('calls onConfirm when the delete button is clicked', async () => {
    const mockConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteGamedayConfirmModal show={true} onHide={vi.fn()} onConfirm={mockConfirm} gamedayName="Test Day" />
    );
    await user.click(screen.getByRole('button', { name: /Delete Gameday/i }));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onHide when the cancel button is clicked', async () => {
    const mockHide = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteGamedayConfirmModal show={true} onHide={mockHide} onConfirm={vi.fn()} gamedayName="Test Day" />
    );
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it('renders without error when gamedayName is omitted', () => {
    render(<DeleteGamedayConfirmModal show={true} onHide={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
