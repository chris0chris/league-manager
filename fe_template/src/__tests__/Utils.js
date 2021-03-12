import {applyMiddleware, createStore} from 'redux';
import rootReducer from '../reducers/index';
import {middleware} from '../store';

export const testStore = (initialState) => {
  return createStore(rootReducer, initialState, applyMiddleware(...middleware));
};
