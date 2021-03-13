import {GET_LIVETICKER} from '../actions/types.js';

const initialState = {
  liveticker: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_LIVETICKER:
      return {
        ...state,
        liveticker: action.payload,
      };

    default:
      return state;
  }
};
