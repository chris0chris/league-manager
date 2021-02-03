import axios from "axios";
import { returnErrors } from "../messages";

export const api_post = (url, body, successType, errorType) => async (
  dispatch,
  getState
) => {
  const header = tokenConfig(getState);


  await axios
    .post(url, body, header)
    .then((res) => {
      dispatch({
        type: successType,
        payload: res.data,
      });
    })
    .catch((err) => {
      dispatch(returnErrors(err.response.data, err.response.status));
      dispatch({
        type: errorType,
      });
    });
};

const tokenConfig = (getState) => {
  const token = getState().authReducer.token;

  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    config.headers["Authorization"] = `Token ${token}`;
  }

  return config;
};
