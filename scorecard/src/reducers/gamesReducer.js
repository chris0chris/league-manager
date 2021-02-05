import {GET_GAMES, SET_SELECTED_GAME} from '../actions/types.js';

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
    case SET_SELECTED_GAME:
      return {
        ...state,
        selectedGame: action.payload,
      };
    default:
      return state;
  }
};
