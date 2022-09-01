import {
  OFFICIALS_GET_TEAM_OFFICIALS,
} from '../actions/types.js';

const initialState = {
  teamOfficials: [],
  // gameSetupOfficials: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case OFFICIALS_GET_TEAM_OFFICIALS:
      return {
        ...state,
        teamOfficials: action.payload,
      };
    default:
      return state;
  }
};
