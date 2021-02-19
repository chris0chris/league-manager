import {
  GET_GAME_OFFICIALS,
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
  GAME_SETUP_OFFICIALS_SUCCESS,
  GAME_SETUP_OFFICIALS_FAIL,
} from './types';
import {apiGet, apiPut} from './utils/api';

export const saveGameSetup = (gameId, gameSetup) => {
  return apiPut(
      `/api/game/${gameId}/setup`,
      gameSetup,
      GAME_SETUP_SUCCESS,
      GAME_SETUP_FAIL,
  );
};

export const getOfficials = (gameId) => {
  return apiGet(
      `/api/game/${gameId}/officials`,
      GET_GAME_OFFICIALS,
  );
};

export const saveOfficials = (gameId, officials) => {
  return apiPut(
      `/api/game/${gameId}/officials`,
      officials,
      GAME_SETUP_OFFICIALS_SUCCESS,
      GAME_SETUP_OFFICIALS_FAIL,
  );
};
