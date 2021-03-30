import {GET_PENALTIES} from '../actions/types.js';

const initialState = {
  penalties: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_PENALTIES:
      return {
        ...state,
        penalties: action.payload,
      };

    default:
      return state;
  }
};
