import { apiGet, apiPut } from '../utils/api';
import { PasscheckVerification, TeamData } from './types';

export const getPasscheckData = async (gameday_id?: string | null) => {
  if (!gameday_id) {
    return await apiGet(`/api/passcheck/games`);
  }

  const data = await apiGet(`/api/passcheck/games/${gameday_id}`);
  return data;
};

export const getRosterList = async (
  team_id: string,
  gameday_id: string
): Promise<TeamData> => {
  const players = await apiGet(
    `/api/passcheck/roster/${team_id}/gameday/${gameday_id}`
  );
  return players;
};

export const submitRoster = async (
  passcheckVerification: PasscheckVerification
) => {
  await apiPut(
    `/api/passcheck/roster/${passcheckVerification.teamId}/gameday/${passcheckVerification.gamedayId}`,
    {...passcheckVerification.data}
  );
};

export const getApprovalUrl = async (teamId: string): Promise<string> => {
  return await apiGet(`/api/passcheck/approval/team/${teamId}`)
}
