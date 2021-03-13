import {combineReducers} from 'redux';
import liveticker from './livetickerReducer';

export default combineReducers({
  livetickerReducer: liveticker,
});
