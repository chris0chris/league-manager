import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RosterOverview from '../RosterOverview';
import { Team, TeamData, Player } from '../../common/types';

import { vi } from 'vitest';
import * as games from '../../common/games';

// Mock dependencies
vi.mock('../../common/games', () => ({
  getRosterList: vi.fn(),
  submitRoster: vi.fn(),
  getApprovalUrl: vi.fn()
}));

const mockSetMessage = vi.fn();
vi.mock('../../hooks/useMessage', () => ({
  __esModule: true,
  default: () => ({
    setMessage: mockSetMessage
  })
}));

interface MockRosterTableProps {
  team: Team;
}

vi.mock('../RosterTable', () => {
  return function MockRosterTable(props: MockRosterTableProps) {
    return (
      <div data-testid="roster-table">
        Roster Table for {props.team.name}
      </div>
    );
  };
});

vi.mock('../../utils/validation', () => {
  return vi.fn().mockImplementation(() => ({
    validateAndUpdate: vi.fn()
  }));
});

describe('RosterOverview', () => {
  const mockPlayer: Player = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    pass_number: 12345,
    jersey_number: 10,
    isSelected: false
  };

  const mockTeam: Team = {
    name: 'Test Team',
    roster: [mockPlayer],
    validator: {
      minimum_player_strength: 5,
      maximum_player_strength: 12
    }
  };

  const mockTeamData: TeamData = {
    team: mockTeam,
    additionalTeams: [],
    official_name: 'Test Official',
    note: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(games.getRosterList).mockResolvedValue(mockTeamData);
    vi.mocked(games.submitRoster).mockResolvedValue({});
    vi.mocked(games.getApprovalUrl).mockResolvedValue('https://approval.url');
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/team/123/gameday/1']}>
        <Routes>
          <Route path="/team/:teamId/gameday/:gamedayId" element={<RosterOverview />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders team information after loading', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Spielendenliste Test Team')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Auswahl abbrechen')).toBeInTheDocument();
    expect(screen.getByText('Passcheck starten')).toBeInTheDocument();
  });

  it('loads roster data on mount', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(games.getRosterList).toHaveBeenCalledWith('123', '1');
    });
  });

  it('handles search functionality', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Test Team durchsuchen ...')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Test Team durchsuchen ...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(searchInput).toHaveValue('John');
  });

  it('shows start button initially', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Passcheck starten')).toBeInTheDocument();
    });
  });

  it('hides start button after clicking it', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Passcheck starten')).toBeInTheDocument();
    });
    
    const startButton = screen.getByText('Passcheck starten');
    fireEvent.click(startButton);
    
    expect(screen.queryByText('Passcheck starten')).not.toBeInTheDocument();
  });

  it('handles form submission', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Passcheck starten')).toBeInTheDocument();
    });

    // Start passcheck
    const startButton = screen.getByText('Passcheck starten');
    fireEvent.click(startButton);

    // Fill official name
    const officialInput = screen.getByPlaceholderText('Vor- und Nachname Official');
    fireEvent.change(officialInput, { target: { value: 'New Official' } });

    // Submit form
    const submitButton = screen.getByText('Passliste abschicken');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(games.submitRoster).toHaveBeenCalled();
    });
  });

  it('handles approval URL loading', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Equipment-Genehmigung öffnen')).toBeInTheDocument();
    });

    const approvalButton = screen.getByText('Equipment-Genehmigung öffnen');
    fireEvent.click(approvalButton);

    await waitFor(() => {
      expect(games.getApprovalUrl).toHaveBeenCalledWith('123');
    });
  });

  it('handles API errors', async () => {
    const error = new Error('API Error');
    vi.mocked(games.getRosterList).mockRejectedValue(error);

    renderWithRouter();

    await waitFor(() => {
      expect(mockSetMessage).toHaveBeenCalledWith({ text: 'API Error' });
    });
  });

  it('renders with additional teams', async () => {
    const teamDataWithAdditional: TeamData = {
      ...mockTeamData,
      additionalTeams: [
        {
          name: 'Additional Team',
          roster: [mockPlayer],
          validator: {}
        }
      ]
    };

    vi.mocked(games.getRosterList).mockResolvedValue(teamDataWithAdditional);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Listen durchsuchen ...')).toBeInTheDocument();
    });
  });

  it('handles navigation back', async () => {
    renderWithRouter();
    
    await waitFor(() => {
      expect(screen.getByText('Auswahl abbrechen')).toBeInTheDocument();
    });
    
    const backButton = screen.getByText('Auswahl abbrechen');
    fireEvent.click(backButton);
    
    // Navigation is handled by react-router
  });
});