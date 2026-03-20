/**
 * Tests for PublishConfirmationModal component
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublishConfirmationModal from '../PublishConfirmationModal';
import type { FlowValidationResult, FlowValidationError } from '../../../types/flowchart';
import '../../../i18n/testConfig';

describe('PublishConfirmationModal', () => {
  const mockOnHide = vi.fn();
  const mockOnConfirm = vi.fn();
  const mockOnHighlight = vi.fn();

  const validResult: FlowValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  it('renders nothing when show is false', () => {
    render(
      <PublishConfirmationModal 
        show={false} 
        onHide={mockOnHide} 
        onConfirm={mockOnConfirm} 
        validation={validResult} 
      />
    );
    expect(screen.queryByText(/modal:publishConfirmation.title/i)).not.toBeInTheDocument();
  });

  it('renders success message when schedule is valid', () => {
    render(
      <PublishConfirmationModal 
        show={true} 
        onHide={mockOnHide} 
        onConfirm={mockOnConfirm} 
        validation={validResult} 
      />
    );
    expect(screen.getByText(/schedule is valid and ready to be published/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Publish Now/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders errors and disables confirm button when invalid', () => {
    const invalidResult: FlowValidationResult = {
      isValid: false,
      errors: [{ 
        id: 'e1', 
        type: 'missing_teams', 
        message: 'Custom Error Message', 
        affectedNodes: ['n1']
      }],
      warnings: []
    };

    render(
      <PublishConfirmationModal 
        show={true} 
        onHide={mockOnHide} 
        onConfirm={mockOnConfirm} 
        validation={invalidResult} 
      />
    );

    expect(screen.getByText(/Blocking Errors Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Error Message/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Publish Now/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('renders warnings and changes confirm button label', () => {
    const warningResult: FlowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [{ 
        id: 'w1', 
        type: 'field_overlap', 
        message: 'Potential Issues Found',
        affectedNodes: ['node-1']
      }]
    };

    render(
      <PublishConfirmationModal 
        show={true} 
        onHide={mockOnHide} 
        onConfirm={mockOnConfirm} 
        validation={warningResult} 
        onHighlight={mockOnHighlight}
      />
    );

    expect(screen.getByText(/Warnings Found/i)).toBeInTheDocument();
    
    const warningItem = screen.getByText(/Potential Issues Found/i);
    fireEvent.click(warningItem);
    expect(mockOnHighlight).toHaveBeenCalled();

    const confirmBtn = screen.getByRole('button', { name: /Publish Anyway/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('triggers highlight and hides modal when clicking an error item', () => {
    const invalidResult: FlowValidationResult = {
      isValid: false,
      errors: [{ 
        id: 'e1', 
        type: 'field_overlap', 
        message: 'Overlap',
        affectedNodes: ['game-1']
      }],
      warnings: []
    };

    render(
      <PublishConfirmationModal 
        show={true} 
        onHide={mockOnHide} 
        onConfirm={mockOnConfirm} 
        validation={invalidResult}
        onHighlight={mockOnHighlight}
      />
    );

    const errorItem = screen.getByText(/Overlap/i);
    fireEvent.click(errorItem);

    expect(mockOnHighlight).toHaveBeenCalledWith('game-1', 'game');
    expect(mockOnHide).toHaveBeenCalled();
  });

  it('uses item.message when messageKey is missing', () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [{ id: 'e1', type: 'unknown', message: 'Raw Error Message' }],
      warnings: []
    };
    render(
      <PublishConfirmationModal show={true} onHide={mockOnHide} onConfirm={mockOnConfirm} validation={validation} />
    );
    expect(screen.getByText(/Raw Error Message/i)).toBeInTheDocument();
  });

  it('uses messageKey and params when available', () => {
    const validation: FlowValidationResult = {
      isValid: false,
      errors: [{ 
        id: 'e1', 
        type: 'overlap', 
        // @ts-expect-error - testing specific message key
        messageKey: 'field_overlap' as unknown as string, 
        messageParams: { game1: 'G1', game2: 'G2', field: 'F1' } 
      }],
      warnings: []
    };
    render(
      <PublishConfirmationModal show={true} onHide={mockOnHide} onConfirm={mockOnConfirm} validation={validation} />
    );
    expect(screen.getByText(/Game "G1" overlaps with "G2" on field "F1"/i)).toBeInTheDocument();
  });

  it('handles other highlight types and fallback', () => {
    const items = [
      { id: '1', type: 'stage_empty', affectedNodes: ['s1'] },
      { id: '2', type: 'field_missing', affectedNodes: ['f1'] },
      { id: '3', type: 'team_missing', affectedNodes: ['t1'] },
      { id: '4', type: 'unknown_type', affectedNodes: ['u1'] },
    ];

    items.forEach(item => {
      mockOnHighlight.mockClear();
      const validation = {
        isValid: false,
        // @ts-expect-error - testing various error types
        errors: [{ ...item, message: `Error ${item.id}` } as unknown as FlowValidationError],
        warnings: []
      };
      
      const { unmount } = render(
        <PublishConfirmationModal 
          show={true} 
          onHide={mockOnHide} 
          onConfirm={mockOnConfirm} 
          validation={validation}
          onHighlight={mockOnHighlight}
        />
      );

      fireEvent.click(screen.getByText(`Error ${item.id}`));
      
      if (item.type.includes('stage')) expect(mockOnHighlight).toHaveBeenCalledWith(item.affectedNodes[0], 'stage');
      else if (item.type.includes('field')) expect(mockOnHighlight).toHaveBeenCalledWith(item.affectedNodes[0], 'field');
      else if (item.type.includes('team')) expect(mockOnHighlight).toHaveBeenCalledWith(item.affectedNodes[0], 'team');
      else expect(mockOnHighlight).toHaveBeenCalledWith(item.affectedNodes[0], 'game');
      
      unmount();
    });
  });
});
