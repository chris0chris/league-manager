import {
  GET_GAMES,
  SET_SELECTED_GAME,
  GET_GAME_LOG,
  GET_GAME_OFFICIALS, GET_GAME_SETUP} from '../actions/types.js';
import {GAME_LOG_COMPLETE_GAME} from '../__tests__/testdata/gameLogData.js';
// import {GAME_LOG_ONLY_FIRSTHALF} from '../__tests__/testdata/gameLogData.js';

const initialState = {
  games: [],
  gameLog: GAME_LOG_COMPLETE_GAME,
  gameSetupOfficials: [],
  gameSetup: {
    ctResult: '',
    direction: '',
    fhPossession: '',
  },
  // gameLog: {
  //   'home': {
  //     'name': 'Heim',
  //     'score': -1,
  //     'firsthalf': {
  //       'score:': -1,
  //       'entries': [],
  //     },
  //     'secondhalf': {
  //       'score:': -1,
  //       'entries': [],
  //     },
  //   },
  //   'away': {
  //     'name': 'Gast',
  //     'score': -1,
  //     'firsthalf': {
  //       'score:': -1,
  //       'entries': [],
  //     },
  //     'secondhalf': {
  //       'score:': -1,
  //       'entries': [],
  //     },
  //   },
  // },
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
    case GET_GAME_OFFICIALS:
      return {
        ...state,
        gameSetupOfficials: action.payload,
      };
    case GET_GAME_SETUP:
      return {
        ...state,
        gameSetup: action.payload,
      };
    default:
      return state;
  }
};
