import {
  GET_GAME_OFFICIALS,
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
  GAME_SETUP_OFFICIALS_SUCCESS,
  GAME_SETUP_OFFICIALS_FAIL,
  GET_GAME_SETUP,
} from "./types";
import { apiGet, apiPut } from "./utils/api";

export const getGameSetup = (gameId) => {
  return apiGet(`/api/game/${gameId}/setup`, GET_GAME_SETUP);
};

export const saveGameSetup = (gameId, gameSetup) => {
  return apiPut(
    `/api/game/${gameId}/setup`,
    gameSetup,
    GAME_SETUP_SUCCESS,
    GAME_SETUP_FAIL,
  );
};

export const getOfficials = (gameId) => {
  return apiGet(`/api/scorecard/game/${gameId}/officials`, GET_GAME_OFFICIALS);
};

export const saveOfficials = (gameId, officials) => {
  return apiPut(
    `/api/scorecard/game/${gameId}/officials`,
    officials,
    GAME_SETUP_OFFICIALS_SUCCESS,
    GAME_SETUP_OFFICIALS_FAIL,
  );
};
