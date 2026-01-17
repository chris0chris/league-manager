/**
 * Tests for FlowToolbar Component - Container Management Patterns
 * 
 * Verified: Add buttons have been moved inline to spatial contexts.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlowToolbar, { type FlowToolbarProps } from '../FlowToolbar';

const defaultProps: FlowToolbarProps = {
  onImport: vi.fn(),
  onExport: vi.fn(),
  gamedayStatus: 'DRAFT',
  canExport: false,
};

describe('FlowToolbar - Inline Add Button Pattern', () => {
  it('does NOT render Add Field button (moved inline to Fields section)', () => {
    render(<FlowToolbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /add field/i })).not.toBeInTheDocument();
  });

  it('does NOT render Add Stage button (moved inline to Field body)', () => {
    render(<FlowToolbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /add stage/i })).not.toBeInTheDocument();
  });

  it('does NOT render Add Game button (moved inline to Stage body)', () => {
    render(<FlowToolbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /add game/i })).not.toBeInTheDocument();
  });

  describe('Remaining toolbar buttons', () => {
    it('renders Import button', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
    });

    it('renders Export button', () => {
      render(<FlowToolbar {...defaultProps} />);
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
    });

    it('disables Export when canExport is false', () => {
      render(<FlowToolbar {...defaultProps} canExport={false} />);
      expect(screen.getByTestId('export-button')).toBeDisabled();
    });

    it('enables Export when canExport is true', () => {
      render(<FlowToolbar {...defaultProps} canExport={true} />);
      expect(screen.getByTestId('export-button')).not.toBeDisabled();
    });
  });
});
