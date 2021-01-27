import axios from "axios";
import { returnErrors } from "./messages";
import { GET_GAMEDAYS } from "./types";

import { tokenConfig } from "../actions/auth";

export const getGamedays = () => (dispatch, getState) => {
  axios
    .get("/api/gameday/list/", tokenConfig(getState))
    .then((res) => {
      dispatch({
        type: GET_GAMEDAYS,
        payload: res.data,
      });
    })
    .catch((err) =>
      dispatch(returnErrors(err.response.data, err.response.status))
    );
};
