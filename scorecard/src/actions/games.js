import {apiGet, apiPost} from './utils/api';
import {GAME_CREATE_LOG_ENTRY_FAIL,
  GAME_CREATE_LOG_ENTRY_SUCCESS,
  GET_GAMES,
  GET_GAME_LOG,
  SET_SELECTED_GAME} from './types';

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

export const getGameLog = (gameId) => {
  return apiGet(`/api/gamelog/${gameId}`, GET_GAME_LOG);
};

export const createLogEntry = (event) => {
  console.log(event);
  return apiPost(`/api/gamelog/${event.gameId}`,
      event, GET_GAME_LOG, GAME_CREATE_LOG_ENTRY_FAIL);
}
;
