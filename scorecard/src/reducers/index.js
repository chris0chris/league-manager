import { combineReducers } from "redux";
import gamedays from "./gamedaysReducer";

export default combineReducers({
  gamedaysReducer: gamedays,
});
