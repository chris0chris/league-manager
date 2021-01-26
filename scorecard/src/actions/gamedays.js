import axios from "axios";
import { returnErrors } from "./messages";
import { GET_GAMEDAYS } from "./types";

export const getGamedays = () => (dispatch) => {
  console.log("calling getGamedays");
  axios
    .get("/api/gameday/list")
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
