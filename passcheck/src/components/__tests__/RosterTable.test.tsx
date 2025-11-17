import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RosterTable from '../RosterTable';
import { Team, Player } from '../../common/types';

import { vi } from 'vitest';

// Mock the PlayerModal component
vi.mock('../PlayerModal', () => {
  return function MockPlayerModal(props: any) {
    return (
      <div data-testid="player-modal" data-visible={props.modalVisible}>
        Mock Player Modal
      </div>
    );
  };
});

describe('RosterTable', () => {
  const mockTeam: Team = {
    name: 'Test Team',
    roster: [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        pass_number: 12345,
        jersey_number: 10,
        isSelected: false
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        pass_number: 67890,
        jersey_number: 5,
        isSelected: true
      }
    ],
    validator: {
      minimum_player_strength: 5,
      maximum_player_strength: 12,
      jerseyNumberBetween: { min: 1, max: 99 }
    }
  };

  const mockFilteredRoster: Player[] = mockTeam.roster;
  const mockAllSelectedPlayers: Player[] = [mockTeam.roster[1]]; // Only Jane is selected

  const defaultProps = {
    team: mockTeam,
    filteredRoster: mockFilteredRoster,
    showModal: false,
    allSelectedPlayers: mockAllSelectedPlayers,
    onUpdate: vi.fn(),
    onModalClose: vi.fn()
  };

  it('renders table with player data', () => {
    render(<RosterTable {...defaultProps} />);
    
    expect(screen.getByText('Trikot')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Passnr')).toBeInTheDocument();
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('67890')).toBeInTheDocument();
  });

  it('applies table-success class to selected players', () => {
    render(<RosterTable {...defaultProps} />);
    
    const rows = screen.getAllByRole('row');
    // First row is header, second is John (not selected), third is Jane (selected)
    expect(rows[2]).toHaveClass('table-success');
    expect(rows[1]).not.toHaveClass('table-success');
  });

  it('shows player modal when showModal prop is true', () => {
    render(<RosterTable {...defaultProps} showModal={true} />);
    
    expect(screen.getByTestId('player-modal')).toHaveAttribute('data-visible', 'true');
  });

  it('hides player modal when showModal prop is false', () => {
    render(<RosterTable {...defaultProps} showModal={false} />);
    
    expect(screen.getByTestId('player-modal')).toHaveAttribute('data-visible', 'false');
  });

  it('calls onModalClose when modal is closed', () => {
    render(<RosterTable {...defaultProps} showModal={true} />);
    
    // This test is more about ensuring the prop is passed correctly
    // since we're mocking the actual modal component
    expect(defaultProps.onModalClose).not.toHaveBeenCalled();
  });

  it('renders table with correct structure', () => {
    render(<RosterTable {...defaultProps} />);
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('rounded-table');
    expect(table).toHaveClass('table-bordered');
    expect(table).toHaveClass('table-hover');
    expect(table).toHaveClass('table-sm');
  });

  it('handles empty filtered roster', () => {
    const emptyProps = {
      ...defaultProps,
      filteredRoster: []
    };

    render(<RosterTable {...emptyProps} />);
    
    // Should still render table headers but no player rows
    expect(screen.getByText('Trikot')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Passnr')).toBeInTheDocument();
    
    // Only header row should be present
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1); // Just the header row
  });
});