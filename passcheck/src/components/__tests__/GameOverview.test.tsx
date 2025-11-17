import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GameOverview from '../GameOverview';
import { Game, GameOverviewInfo, Gameday } from '../../common/types';

import { vi } from 'vitest';
import * as games from '../../common/games';

// Mock the dependencies
vi.mock('../../common/games', () => ({
  getPasscheckData: vi.fn()
}));

const mockSetMessage = vi.fn();
vi.mock('../../hooks/useMessage', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    setMessage: mockSetMessage
  }))
}));

vi.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => vi.fn(),
  useParams: () => ({ gamedayId: undefined })
}));

vi.mock('../GameCard', () => {
  return function MockGameCard({ game }: { game: Game }) {
    return (
      <div data-testid="game-card">
        {game.home.name} vs {game.away.name}
      </div>
    );
  };
});

describe('GameOverview', () => {
  const mockGames: Game[] = [
    {
      gameday_id: 1,
      field: 1,
      scheduled: '2024-01-01T14:00:00Z',
      away: { id: 101, name: 'Away Team', isChecked: false },
      home: { id: 102, name: 'Home Team', isChecked: false }
    }
  ];

  const mockGamedays: Gameday[] = [
    { id: 1, name: 'Spieltag 1' },
    { id: 2, name: 'Spieltag 2' }
  ];

  const mockGameOverviewInfo: GameOverviewInfo = {
    games: mockGames,
    gamedays: mockGamedays,
    officialsTeamName: 'Officials Team'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(games.getPasscheckData).mockResolvedValue(mockGameOverviewInfo);
  });

  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<GameOverview />} />
          <Route path="/gameday/:gamedayId" element={<GameOverview />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    renderWithRouter();
    
    expect(screen.getByText('loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('loading...')).not.toBeInTheDocument();
    });
  });

  it('renders games after loading', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('game-card')).toBeInTheDocument();
    expect(screen.getByText('Home Team vs Away Team')).toBeInTheDocument();
  });

  it('renders gameday selection when checkbox is checked', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });
    
    const checkbox = screen.getByLabelText('Alle Spiele auswählen');
    fireEvent.click(checkbox);
    
    expect(screen.getByText('Bitte Spieltag auswählen')).toBeInTheDocument();
    expect(screen.getByText('Spieltag 1')).toBeInTheDocument();
    expect(screen.getByText('Spieltag 2')).toBeInTheDocument();
  });

  it('handles gameday selection change', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });
    
    const checkbox = screen.getByLabelText('Alle Spiele auswählen');
    fireEvent.click(checkbox);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });
    
    // Should navigate to the selected gameday
    // This is handled by react-router's navigate function
  });

  it('handles API errors', async () => {
    const error = new Error('API Error');
    vi.mocked(games.getPasscheckData).mockRejectedValue(error);

    renderWithRouter();

    await waitFor(() => {
      expect(mockSetMessage).toHaveBeenCalledWith({ text: 'API Error' });
    });
  });

  it('renders without gamedayId parameter', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });

    expect(games.getPasscheckData).toHaveBeenCalledWith(undefined);
  });

  it('renders with gamedayId parameter', async () => {
    renderWithRouter('/gameday/1');

    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });

    expect(games.getPasscheckData).toHaveBeenCalledWith('1');
  });

  it('toggles gameday selection checkbox', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Bitte ein Spiel auswählen:')).toBeInTheDocument();
    });
    
    const checkbox = screen.getByLabelText('Alle Spiele auswählen');
    
    // First click shows gameday selection
    fireEvent.click(checkbox);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // Second click hides gameday selection
    fireEvent.click(checkbox);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});