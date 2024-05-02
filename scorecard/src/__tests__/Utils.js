import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '../reducers/index';

export const testStore = (initialState = {}) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState,
  });
};