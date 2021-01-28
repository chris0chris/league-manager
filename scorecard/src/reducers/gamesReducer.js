import { GET_GAMES } from "../actions/types.js";

const initialState = {
  games: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_GAMES:
      return {
        ...state,
        games: action.payload,
      };

    default:
      return state;
  }
};
