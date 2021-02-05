import {GET_GAMEDAYS} from '../actions/types.js';

const initialState = {
  gamedays: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_GAMEDAYS:
      return {
        ...state,
        gamedays: action.payload,
      };

    default:
      return state;
  }
};
