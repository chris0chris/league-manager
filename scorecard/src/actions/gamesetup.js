import axios from "axios";
import { returnErrors } from "./messages";
import {
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
  GAME_SETUP_OFFICIALS_SUCCESS,
  GAME_SETUP_OFFICIALS_FAIL,
} from "./types";
import { api_post, api_create } from "./helper/api";

export const saveGameSetup = (gameSetup) => {
  return api_post(
    "/api/gamesetup/create",
    gameSetup,
    GAME_SETUP_SUCCESS,
    GAME_SETUP_FAIL
  );
};

export const saveOfficials = (officials) => {
  return api_post(
    "/api/officials/create",
    officials,
    GAME_SETUP_OFFICIALS_SUCCESS,
    GAME_SETUP_OFFICIALS_FAIL
  );
};
