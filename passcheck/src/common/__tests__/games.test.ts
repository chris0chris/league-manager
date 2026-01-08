import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPasscheckData, getRosterList, submitRoster, getApprovalUrl } from '../games';
import * as api from '../../utils/api';

vi.mock('../../utils/api');

describe('games utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPasscheckData', () => {
    it('fetches all games when gameday_id is not provided', async () => {
      const mockData = { games: [] };
      vi.mocked(api.apiGet).mockResolvedValue(mockData);

      const result = await getPasscheckData();

      expect(api.apiGet).toHaveBeenCalledWith('/api/passcheck/games');
      expect(result).toEqual(mockData);
    });

    it('fetches all games when gameday_id is null', async () => {
      const mockData = { games: [] };
      vi.mocked(api.apiGet).mockResolvedValue(mockData);

      const result = await getPasscheckData(null);

      expect(api.apiGet).toHaveBeenCalledWith('/api/passcheck/games');
      expect(result).toEqual(mockData);
    });

    it('fetches specific gameday data when gameday_id is provided', async () => {
      const mockData = { id: '123', games: [] };
      vi.mocked(api.apiGet).mockResolvedValue(mockData);

      const result = await getPasscheckData('123');

      expect(api.apiGet).toHaveBeenCalledWith('/api/passcheck/games/123');
      expect(result).toEqual(mockData);
    });
  });

  describe('getRosterList', () => {
    it('fetches roster for a team and gameday', async () => {
      const mockTeamData = {
        team: { id: 'team1', name: 'Team A' },
        roster: [],
        validator: {},
      };
      vi.mocked(api.apiGet).mockResolvedValue(mockTeamData);

      const result = await getRosterList('team1', 'gameday1');

      expect(api.apiGet).toHaveBeenCalledWith(
        '/api/passcheck/roster/team1/gameday/gameday1'
      );
      expect(result).toEqual(mockTeamData);
    });
  });

  describe('submitRoster', () => {
    it('submits roster data', async () => {
      const mockVerification = {
        teamId: 'team1',
        gamedayId: 'gameday1',
        data: { players: [] },
      };
      vi.mocked(api.apiPut).mockResolvedValue(undefined);

      await submitRoster(mockVerification);

      expect(api.apiPut).toHaveBeenCalledWith(
        '/api/passcheck/roster/team1/gameday/gameday1',
        { players: [] }
      );
    });
  });

  describe('getApprovalUrl', () => {
    it('fetches approval URL for a team', async () => {
      const mockUrl = 'https://example.com/approval';
      vi.mocked(api.apiGet).mockResolvedValue(mockUrl);

      const result = await getApprovalUrl('team1');

      expect(api.apiGet).toHaveBeenCalledWith('/api/passcheck/approval/team/team1');
      expect(result).toEqual(mockUrl);
    });
  });
});
