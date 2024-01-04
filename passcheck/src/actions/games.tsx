import {apiGet } from './utils/api';
import {GET_GAMES} from './types';

export const getGames = (gameday: number, team: string) => {
  return apiGet(
      `/api/passcheck/list/gameinfo/${gameday}/officials/${team}`,
      GET_GAMES,
  );
};