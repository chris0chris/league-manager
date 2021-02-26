import axios from 'axios';
import {returnErrors} from './messages';
import {
  USER_LOADED,
  USER_LOADING,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT_SUCCESS,
} from './types';

export const loadUser = () => async (dispatch, getState) => {
  dispatch({type: USER_LOADING});

  const header = tokenConfig(getState);

  await axios
      .get('/accounts/auth/user/', header)
      .then((res) => {
        dispatch({
          type: USER_LOADED,
          payload: res.data,
        });
      })
      .catch((err) => {
        dispatch(returnErrors(err.response.data.detail, err.response.status));
        dispatch({
          type: AUTH_ERROR,
        });
      });
};

export const loginUser = (username, password) => async (dispatch) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const body = JSON.stringify({username, password});

  await axios
      .post('/accounts/auth/login/', body, config)
      .then((res) => {
        dispatch({
          type: LOGIN_SUCCESS,
          payload: res.data,
        });
      })
      .catch((err) => {
        dispatch(returnErrors(err.response.data, err.response.status));
        dispatch({
          type: LOGIN_FAIL,
        });
      });
};

export const logoutUser = () => async (dispatch, getState) => {
  const header = tokenConfig(getState);

  await axios
      .post('/accounts/auth/logout/', null, header)
      .then((res) => {
        dispatch({
          type: LOGOUT_SUCCESS,
          payload: res.data,
        });
      })
      .catch((err) => {
        dispatch(returnErrors(err.response.data.detail, err.response.status));
        dispatch({
          type: AUTH_ERROR,
        });
      });
};

export const tokenConfig = (getState) => {
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
