import {apiGet, apiPut} from '../actions/utils/api';
import {apiTeam, apiTokens, apiGames, apiGamedays, apiUsernames} from './types';

export const getPasscheckData = async (team_id?: string | null) => {
  if (!team_id) {
    return await apiGet(`/api/passcheck/games/`);
  }

  const data = await apiGet(`/api/passcheck/games/${team_id}/`);
  return data;
};

export const getPlayerList = async (team_id: number) => {
  const players = await apiGet(`/api/passcheck/roster/${team_id}/`);
  return players;
};

export const submitRoster = async (team?: number, roster?: any) => {
  await apiPut(`/api/passcheck/roster/${team}/`, roster);
};
