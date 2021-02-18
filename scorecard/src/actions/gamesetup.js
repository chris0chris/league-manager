import {
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
  GAME_SETUP_OFFICIALS_SUCCESS,
  GAME_SETUP_OFFICIALS_FAIL,
} from './types';
import {apiPost, apiPut} from './utils/api';

export const saveGameSetup = (gameId, gameSetup) => {
  return apiPut(
      `/api/game/${gameId}/setup`,
      gameSetup,
      GAME_SETUP_SUCCESS,
      GAME_SETUP_FAIL,
  );
};

export const saveOfficials = (officials) => {
  return apiPost(
      '/api/officials/create',
      officials,
      GAME_SETUP_OFFICIALS_SUCCESS,
      GAME_SETUP_OFFICIALS_FAIL,
  );
};
