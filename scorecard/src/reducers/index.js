import {combineReducers} from 'redux';
import gamedays from './gamedaysReducer';
import message from './messageReducer';
import auth from './authReducer';
import games from './gamesReducer';

export default combineReducers({
  gamedaysReducer: gamedays,
  gamesReducer: games,
  messageReducer: message,
  authReducer: auth,
});
