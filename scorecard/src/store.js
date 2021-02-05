import {createStore, applyMiddleware} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import rootReducer from './reducers';
import {GAME_PAIR_1} from './__tests__/testdata/gamesData';

// const initialState = {};

// only for debug mode
const initialState = {
  // gamedaysReducer: {
  //   ...TWO_GAMEDAYS,
  // },
  gamesReducer: {
    selectedGame: GAME_PAIR_1,
    games: [],
  },
};
export const middleware = [thunk];

export const store = createStore(
    rootReducer,
    initialState,
    composeWithDevTools(applyMiddleware(...middleware)),
);
