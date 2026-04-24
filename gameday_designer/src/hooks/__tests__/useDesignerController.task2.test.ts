import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesignerController } from '../useDesignerController';
import { useFlowState } from '../useFlowState';
import * as tournamentGenerator from '../../utils/tournamentGenerator';
import * as teamAssignment from '../../utils/teamAssignment';
import type { TournamentTemplate } from '../../types/tournament';
import type { GlobalTeam } from '../../types/flowchart';

vi.mock('../../utils/tournamentGenerator', () => ({
  generateTournament: vi.fn(),
}));

vi.mock('../../utils/teamAssignment', () => ({
  generateTeamsForTournament: vi.fn(() => []),
  assignTeamsToTournamentGames: vi.fn(() => []),
}));

const mockTemplate: TournamentTemplate = {
  id: 't1',
  name: 'Test Template',
  teamCount: { min: 4, max: 4, exact: 4 },
  fieldOptions: [1],
  stages: [],
  timing: { firstGameStartTime: '09:00', defaultGameDuration: 15, defaultBreakBetweenGames: 5 }
};

const mockConfig = {
  template: mockTemplate,
  fieldCount: 1,
  startTime: '09:00',
  generateTeams: false,
  autoAssignTeams: false,
};

describe('useDesignerController Task 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('combines selectedTeams and generated teams when generateTeams is true', async () => {
    const selectedTeams: GlobalTeam[] = [
      { id: 's1', label: 'Selected 1', groupId: null, order: 0 }
    ];
    
    // We expect 4 teams total. 1 is selected, so 3 should be generated.
    vi.mocked(teamAssignment.generateTeamsForTournament).mockReturnValue([
      { label: 'Gen 1', color: '#111' },
      { label: 'Gen 2', color: '#222' },
      { label: 'Gen 3', color: '#333' },
    ]);
    
    vi.mocked(tournamentGenerator.generateTournament).mockReturnValue({
      fields: [],
      stages: [],
      games: []
    });

    const { result } = renderHook(() => {
      const flowState = useFlowState();
      return useDesignerController(undefined, flowState);
    });

    await act(async () => {
      await result.current.handlers.handleGenerateTournament({
        ...mockConfig,
        generateTeams: true,
        selectedTeams
      });
    });

    // Verify generateTeamsForTournament was called with 3 (4 total - 1 selected)
    // and startOffset of 1 (since 1 team was already in teamsToUse)
    expect(teamAssignment.generateTeamsForTournament).toHaveBeenCalledWith(3, 1);
    
    // Verify generateTournament was called with all 4 teams
    const teamsToUse = vi.mocked(tournamentGenerator.generateTournament).mock.calls[0][0];
    expect(teamsToUse).toHaveLength(4);
    expect(teamsToUse).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Selected 1' }),
      expect.objectContaining({ label: 'Gen 1' }),
      expect.objectContaining({ label: 'Gen 2' }),
      expect.objectContaining({ label: 'Gen 3' }),
    ]));
  });
});
