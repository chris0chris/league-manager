import axios from 'axios';
import {returnErrors} from '../messages';
import {GET_PENALTIES} from '../types';

export const apiPost = (url, body, successType, errorType) => async (
    dispatch,
    getState,
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

export const apiDelete = (url, body, successType, errorType) => async (
    dispatch,
    getState,
) => {
  const header = tokenConfig(getState);

  await axios
      .delete(url, {...header, data: body})
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

export const apiPut = (url, body, successType, errorType) => async (
    dispatch,
    getState,
) => {
  const header = tokenConfig(getState);

  await axios
      .put(url, body, header)
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

export const apiGet = (url, successType) => async (dispatch, getState) => {
  await axios
      .get(url, tokenConfig(getState))
      .then((res) => {
        dispatch({
          type: successType,
          payload: res.data,
        });
      })
      .catch((err) =>
        dispatch(returnErrors(err.response.data, err.response.status)),
      );
};

const tokenConfig = (getState) => {
  const token = getState().authReducer.token;

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }

  return config;
};
