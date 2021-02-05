import {combineReducers} from 'redux';
import gamedays from './gamedaysReducer';
import errors from './errorsReducer';
import auth from './authReducer';
import games from './gamesReducer';

export default combineReducers({
  gamedaysReducer: gamedays,
  gamesReducer: games,
  errorsReducer: errors,
  authReducer: auth,
});
