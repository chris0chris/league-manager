import {GET_ERRORS, MESSAGE_GAME_LOG} from '../actions/types';

const initialState = {
  msg: {},
  status: null,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_ERRORS:
      return {
        msg: action.payload.msg,
        status: action.payload.status,
      };
    case MESSAGE_GAME_LOG: {
      console.log(MESSAGE_GAME_LOG, action.payload, 200);
      return {
        msg: action.payload,
        status: 200,
      };
    }
    default:
      return state;
  }
};
