import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerLine from '../PlayerLine';
import { Player } from '../../common/types';

describe('PlayerLine', () => {
  const mockPlayer: Player = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    pass_number: 12345,
    jersey_number: 10,
    isSelected: false,
    validationError: undefined
  };

  it('renders player information correctly', () => {
    render(<PlayerLine playersData={mockPlayer} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('has table-border class on all cells', () => {
    render(<PlayerLine playersData={mockPlayer} />);
    
    const cells = screen.getAllByRole('cell');
    cells.forEach(cell => {
      expect(cell).toHaveClass('table-border');
    });
  });

  it('renders correctly with validation error', () => {
    const playerWithError: Player = {
      ...mockPlayer,
      validationError: 'Invalid pass number'
    };

    render(<PlayerLine playersData={playerWithError} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('renders correctly when player is selected', () => {
    const selectedPlayer: Player = {
      ...mockPlayer,
      isSelected: true
    };

    render(<PlayerLine playersData={selectedPlayer} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });
});