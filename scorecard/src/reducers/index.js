import {combineReducers} from 'redux';
import gamedays from './gamedaysReducer';
import message from './messageReducer';
import auth from './authReducer';
import games from './gamesReducer';
import config from './configReducer';
import teamOfficials from './officialsReducer';
import passcheckReducer from './passcheckReducer';

export default combineReducers({
  gamedaysReducer: gamedays,
  gamesReducer: games,
  messageReducer: message,
  authReducer: auth,
  configReducer: config,
  officialsReducer: teamOfficials,
  passcheckReducer: passcheckReducer,
});
