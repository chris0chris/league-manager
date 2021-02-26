import {GET_ERRORS} from './types';

export const returnErrors = (msg, status) => {
  return {
    type: GET_ERRORS,
    payload: {msg, status},
  };
};

export const sendMessage = (type, payload) => (dispatch) => {
  dispatch({
    type: type,
    payload: payload,
  });
};
