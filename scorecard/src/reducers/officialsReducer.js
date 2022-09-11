import {
  OFFICIALS_GET_TEAM_OFFICIALS,
  OFFICIALS_SEARCH_FOR_OFFICIALS,
} from '../actions/types.js';

const initialState = {
  teamOfficials: [],
  searchOfficialsResult: [],
  // gameSetupOfficials: [],
};

export default (state = initialState, action) => {
  switch (action.type) {
    case OFFICIALS_GET_TEAM_OFFICIALS:
      return {
        ...state,
        teamOfficials: action.payload,
      };
    case OFFICIALS_SEARCH_FOR_OFFICIALS:
      return {
        ...state,
        searchOfficialsResult: action.payload,
      };
    default:
      return state;
  }
};
