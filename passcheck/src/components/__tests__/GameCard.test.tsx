import React from 'react';
import { render, screen } from '@testing-library/react';
import GameCard from '../GameCard';
import { Game } from '../../common/types';

describe('GameCard', () => {
  const mockGame: Game = {
    gameday_id: 1,
    field: 2,
    scheduled: '2024-01-01T14:00:00Z',
    away: {
      id: 101,
      name: 'Away Team',
      isChecked: false
    },
    home: {
      id: 102,
      name: 'Home Team',
      isChecked: false
    }
  };

  it('renders game information correctly', () => {
    render(<GameCard game={mockGame} />);
    
    expect(screen.getByText('2024- Uhr: Feld 2')).toBeInTheDocument();
    expect(screen.getByText('Away Team')).toBeInTheDocument();
    expect(screen.getByText('Home Team')).toBeInTheDocument();
  });

  it('renders buttons with correct href attributes', () => {
    render(<GameCard game={mockGame} />);
    
    const awayButton = screen.getByText('Away Team');
    const homeButton = screen.getByText('Home Team');
    
    expect(awayButton).toHaveAttribute('href', '#/team/101/gameday/1');
    expect(homeButton).toHaveAttribute('href', '#/team/102/gameday/1');
  });

  it('applies primary variant when teams are not checked', () => {
    render(<GameCard game={mockGame} />);
    
    const awayButton = screen.getByText('Away Team');
    const homeButton = screen.getByText('Home Team');
    
    expect(awayButton).toHaveClass('btn-primary');
    expect(homeButton).toHaveClass('btn-primary');
  });

  it('applies success variant when teams are checked', () => {
    const checkedGame: Game = {
      ...mockGame,
      away: { ...mockGame.away, isChecked: true },
      home: { ...mockGame.home, isChecked: true }
    };

    render(<GameCard game={checkedGame} />);
    
    const awayButton = screen.getByText('Away Team');
    const homeButton = screen.getByText('Home Team');
    
    expect(awayButton).toHaveClass('btn-success');
    expect(homeButton).toHaveClass('btn-success');
  });

  it('applies mixed variants when one team is checked', () => {
    const mixedGame: Game = {
      ...mockGame,
      away: { ...mockGame.away, isChecked: true },
      home: { ...mockGame.home, isChecked: false }
    };

    render(<GameCard game={mixedGame} />);
    
    const awayButton = screen.getByText('Away Team');
    const homeButton = screen.getByText('Home Team');
    
    expect(awayButton).toHaveClass('btn-success');
    expect(homeButton).toHaveClass('btn-primary');
  });

  it('has large button size', () => {
    render(<GameCard game={mockGame} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('btn-lg');
    });
  });

  it('renders time in correct format', () => {
    render(<GameCard game={mockGame} />);
    
    expect(screen.getByText('2024- Uhr: Feld 2')).toBeInTheDocument();
  });
});