import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerModal from '../PlayerModal';
import { Player } from '../../common/types';

import { vi } from 'vitest';

// Mock the Validator class
const mockValidateAndGetErrors = vi.fn().mockReturnValue([]);
const mockValidateAndUpdate = vi.fn();

vi.mock('../../utils/validation', () => {
  return vi.fn().mockImplementation(() => ({
    validateAndGetErrors: mockValidateAndGetErrors,
    validateAndUpdate: mockValidateAndUpdate
  }));
});

interface MockValidator {
  validateAndGetErrors: typeof mockValidateAndGetErrors;
  validateAndUpdate: typeof mockValidateAndUpdate;
}

describe('PlayerModal', () => {
  const mockPlayer: Player = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    pass_number: 12345,
    jersey_number: 10,
    isSelected: false
  };

  let mockValidator: MockValidator;
  
  beforeEach(() => {
    mockValidator = {
      validateAndGetErrors: mockValidateAndGetErrors,
      validateAndUpdate: mockValidateAndUpdate
    };
  });

  const defaultProps = {
    modalVisible: true,
    handleClose: vi.fn(),
    nextPlayer: vi.fn(),
    player: mockPlayer,
    validator: mockValidator
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAndGetErrors.mockReturnValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders player information correctly', () => {
    render(<PlayerModal {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('calls handleClose when close button is clicked', () => {
    render(<PlayerModal {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(defaultProps.handleClose).toHaveBeenCalled();
  });

  it('disables jersey number input when player is selected', () => {
    const selectedPlayerProps = {
      ...defaultProps,
      player: { ...mockPlayer, isSelected: true }
    };

    render(<PlayerModal {...selectedPlayerProps} />);
    
    const jerseyInput = screen.getByPlaceholderText('Trikotnummer');
    expect(jerseyInput).toBeDisabled();
  });

  it('enables jersey number input when player is not selected', () => {
    render(<PlayerModal {...defaultProps} />);
    
    const jerseyInput = screen.getByPlaceholderText('Trikotnummer');
    expect(jerseyInput).not.toBeDisabled();
  });

  it.skip('calls nextPlayer with correct direction', () => {
    const { container } = render(<PlayerModal {...defaultProps} />);

    const nextButton = container.querySelector('.modal-button-right') as HTMLElement;
    const prevButton = container.querySelector('.modal-button-left') as HTMLElement;

    fireEvent.click(nextButton);
    expect(defaultProps.nextPlayer).toHaveBeenCalledWith(1);

    fireEvent.click(prevButton);
    expect(defaultProps.nextPlayer).toHaveBeenCalledWith(-1);
  });

  it('does not render when modalVisible is false', () => {
    const hiddenProps = {
      ...defaultProps,
      modalVisible: false
    };

    const { container } = render(<PlayerModal {...hiddenProps} />);
    
    // Modal should not be in the document when not visible
    expect(container.firstChild).toBeNull();
  });

});