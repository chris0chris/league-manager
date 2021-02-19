import {
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
  GAME_SETUP_OFFICIALS_SUCCESS,
  GAME_SETUP_OFFICIALS_FAIL,
} from './types';
import {apiPut} from './utils/api';

export const saveGameSetup = (gameId, gameSetup) => {
  return apiPut(
      `/api/game/${gameId}/setup`,
      gameSetup,
      GAME_SETUP_SUCCESS,
      GAME_SETUP_FAIL,
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
