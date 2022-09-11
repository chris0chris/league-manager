import {apiGet} from './utils/api';
import {OFFICIALS_GET_TEAM_OFFICIALS,
  OFFICIALS_SEARCH_FOR_OFFICIALS} from './types';

export const getTeamOfficials = (team) => {
  return apiGet(
      `/api/officials/team/${team}/list`,
      OFFICIALS_GET_TEAM_OFFICIALS,
  );
};

export const searchForOfficials = (team, name) => {
  return apiGet(
      `/api/officials/search/exclude/team/${team}/list?name=${name}`,
      OFFICIALS_SEARCH_FOR_OFFICIALS,
  );
};
