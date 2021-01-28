import { applyMiddleware, createStore } from "redux";
import rootReducer from "../reducers/index";
import { middleware } from "../store";

// export const testStore = (initialState) => {
//   const createStoreWithMiddleware = applyMiddleware(...middleware)(createStore);
//   return createStoreWithMiddleware(rootReducer, initialState);
// };

export const testStore = (initialState) => {
  return createStore(rootReducer, initialState, applyMiddleware(...middleware));
};
