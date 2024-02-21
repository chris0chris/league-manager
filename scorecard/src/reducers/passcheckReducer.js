import {GET_PASSCHECK_STATUS} from '../actions/types';

const initialState = {
  completed: false,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_PASSCHECK_STATUS:
      console.log('action.payload', action.payload);
      return {
        ...state,
        completed: action.payload.completed,
      };
    default:
      return state;
  }
};
