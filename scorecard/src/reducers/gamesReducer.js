import {GET_GAMES, SET_SELECTED_GAME, GET_GAME_LOG} from '../actions/types.js';

const initialState = {
  games: [],
  gameLog: {
    'home': {
      'name': 'Heim',
      'score': -1,
      'firsthalf': {
        'score:': -1,
        'entries': [],
      },
      'secondhalf': {
        'score:': -1,
        'entries': [],
      },
    },
    'away': {
      'name': 'Gast',
      'score': -1,
      'firsthalf': {
        'score:': -1,
        'entries': [],
      },
      'secondhalf': {
        'score:': -1,
        'entries': [],
      },
    },
  },
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
    case GET_GAME_LOG:
      return {
        ...state,
        gameLog: action.payload,
      };
    default:
      return state;
  }
};
