import { combineReducers } from "redux";
import gamedays from "./gamedaysReducer";
import errors from "./errorsReducer";

export default combineReducers({
  gamedaysReducer: gamedays,
  errorsReducer: errors,
});
