import {apiGet} from './utils/api';
import {GET_GAMES, SET_SELECTED_GAME} from './types';

export const getGames = (gamedayId) => {
  return apiGet(
      `/api/gameday/${gamedayId}/details?get=schedule&orient=records`,
      GET_GAMES,
  );
};

export const setSelectedGame = (selectedGame) => (dispatch) => {
  dispatch({
    type: SET_SELECTED_GAME,
    payload: selectedGame,
  });
};
