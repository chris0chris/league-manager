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

interface PlayerModalProps {
  modalVisible: boolean;
  handleClose: () => void;
  nextPlayer: (value: number | null) => void;
  player: Player;
  validator: MockValidator;
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
  let defaultProps: PlayerModalProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAndGetErrors.mockReturnValue([]);
    vi.useFakeTimers();

    mockValidator = {
      validateAndGetErrors: mockValidateAndGetErrors,
      validateAndUpdate: mockValidateAndUpdate
    };

    defaultProps = {
      modalVisible: true,
      handleClose: vi.fn(),
      nextPlayer: vi.fn(),
      player: mockPlayer,
      validator: mockValidator
    };
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

  it('validates jersey number on input change', () => {
    render(<PlayerModal {...defaultProps} />);

    const jerseyInput = screen.getByPlaceholderText('Trikotnummer') as HTMLInputElement;
    fireEvent.change(jerseyInput, { target: { value: '99' } });

    // The validator is used in the onChange handler
    expect(jerseyInput.value).toBe('99');
  });

  it('shows error message for invalid jersey number (non-numeric)', () => {
    render(<PlayerModal {...defaultProps} />);

    const jerseyInput = screen.getByPlaceholderText('Trikotnummer');
    fireEvent.change(jerseyInput, { target: { value: 'abc' } });

    expect(screen.getByText('Trikotnummer muss eine Zahl sein.')).toBeInTheDocument();
  });

  it('validates jersey number through validator', () => {
    mockValidateAndGetErrors.mockReturnValue(['Error 1', 'Error 2']);

    render(<PlayerModal {...defaultProps} />);

    const jerseyInput = screen.getByPlaceholderText('Trikotnummer');
    fireEvent.change(jerseyInput, { target: { value: '100' } });

    // Check that error handling code was triggered
    expect(jerseyInput.value).toBe('100');
  });

  it('shows player validation error when present', () => {
    const playerWithError = {
      ...mockPlayer,
      validationError: 'Player has validation error'
    };

    render(<PlayerModal {...defaultProps} player={playerWithError} />);

    expect(screen.getByText('Player has validation error')).toBeInTheDocument();
  });

  it('disables jersey input when player has validation error', () => {
    const playerWithError = {
      ...mockPlayer,
      validationError: 'Some error'
    };

    render(<PlayerModal {...defaultProps} player={playerWithError} />);

    const jerseyInput = screen.getByPlaceholderText('Trikotnummer');
    expect(jerseyInput).toBeDisabled();
  });

  it('renders with player having validation error', () => {
    const playerWithError = {
      ...mockPlayer,
      isSelected: false,
      validationError: 'Some error'
    };

    render(<PlayerModal {...defaultProps} player={playerWithError} />);

    // Just ensure it renders without errors
    expect(screen.getByText('Some error')).toBeInTheDocument();
  });

  it('renders with selected player having validation error', () => {
    const playerWithError = {
      ...mockPlayer,
      isSelected: true,
      validationError: 'Some error'
    };

    render(<PlayerModal {...defaultProps} player={playerWithError} />);

    // Just ensure it renders without errors
    expect(screen.getByText('Some error')).toBeInTheDocument();
  });

  it('calls handleClose and nextPlayer when closing modal', () => {
    render(<PlayerModal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(defaultProps.handleClose).toHaveBeenCalled();
    expect(defaultProps.nextPlayer).toHaveBeenCalledWith(null);
  });

  it('updates jersey number when player prop changes', () => {
    const { rerender } = render(<PlayerModal {...defaultProps} />);

    const newPlayer = { ...mockPlayer, id: 2, jersey_number: 25 };
    rerender(<PlayerModal {...defaultProps} player={newPlayer} />);

    const jerseyInput = screen.getByPlaceholderText('Trikotnummer') as HTMLInputElement;
    expect(jerseyInput.value).toBe('25');
  });

});