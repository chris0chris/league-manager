import {apiGet, apiPut} from '../actions/utils/api';
import {Roster} from './types';

export const getPasscheckData = async (team_id?: string | null) => {
  if (!team_id) {
    return await apiGet(`/api/passcheck/games/`);
  }

  const data = await apiGet(`/api/passcheck/games/${team_id}/`);
  return data;
};

export const getPlayerList = async (team_id: string, gameday_id: string) => {
  const players = await apiGet(
    `/api/passcheck/roster/${team_id}/gameday/${gameday_id}/`
  );
  return players;
};

export const submitRoster = async (
  team: string,
  gameday_id: string,
  roster: Roster
) => {
  await apiPut(`/api/passcheck/roster/${team}/gameday/${gameday_id}/`, roster);
};
