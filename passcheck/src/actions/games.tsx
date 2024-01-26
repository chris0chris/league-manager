import {apiGet} from './utils/api';

export const getGames = (gameday: number, team: number) => {
  return apiGet(`/api/passcheck/list/gameinfo/${gameday}/officials/${team}`);
};
