import {
  GAME_SETUP_SUCCESS,
  GET_GAMES,
  SET_SELECTED_GAME,
} from "../actions/types.js";

const initialState = {
  games: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_GAMES:
    case SET_SELECTED_GAME:
    case GAME_SETUP_SUCCESS:
      return {
        ...state,
        games: action.payload,
      };
    default:
      return state;
  }
};
