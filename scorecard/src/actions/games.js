import {apiGet, apiPost, apiPut} from './utils/api';
import {GAME_CREATE_LOG_ENTRY_FAIL,
  GAME_FINALIZE_FAIL, GAME_FINALIZE_SUCCESS,
  GAME_HALFTIME_FAIL,
  GAME_HALFTIME_SUCCESS,
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
};

export const halftime = (event) => {
  return apiPut(
      `/api/game/halftime`,
      event,
      GAME_HALFTIME_SUCCESS,
      GAME_HALFTIME_FAIL);
};

export const gameFinalize = (gameId, data) => {
  return apiPut(
      `/api/game/${gameId}/finalize`,
      data,
      GAME_FINALIZE_SUCCESS,
      GAME_FINALIZE_FAIL,
  );
};
