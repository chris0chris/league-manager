import {GET_ERRORS, GET_GAME_LOG} from '../actions/types';

const initialState = {
  msg: {},
  status: null,
  firstCall: true,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_ERRORS:
      return {
        ...state,
        msg: action.payload.msg,
        status: action.payload.status,
      };
    case GET_GAME_LOG: {
      if (state.firstCall) {
        return {
          msg: '',
          status: null,
        };
      }
      return {
        msg: action.payload,
        status: 200,
      };
    }
    default:
      return state;
  }
};
