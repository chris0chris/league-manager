import axios from "axios";
import { returnErrors } from "./messages";
import {
  USER_LOADED,
  USER_LOADING,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT_SUCCESS,
  GAME_SETUP_SUCCESS,
  GAME_SETUP_FAIL,
} from "./types";
import { api_post } from "./helper/api";

export const saveGameSetup = (gameSetup) => {
  return api_post(
    "/api/gameofficial/create",
    gameSetup,
    GAME_SETUP_SUCCESS,
    GAME_SETUP_FAIL
  );
};

export const logoutUser = () => async (dispatch, getState) => {
  const header = tokenConfig(getState);

  await axios
    .post("/accounts/auth/logout/", null, header)
    .then((res) => {
      dispatch({
        type: LOGOUT_SUCCESS,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch(returnErrors(err.response.data, err.response.status));
      dispatch({
        type: AUTH_ERROR,
      });
    });
};
