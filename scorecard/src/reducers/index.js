import { combineReducers } from "redux";
import gamedays from "./gamedaysReducer";
import errors from "./errorsReducer";
import auth from "./authReducer";

export default combineReducers({
  gamedaysReducer: gamedays,
  errorsReducer: errors,
  authReducer: auth,
});
