import {apiGet} from './utils/api';
import {OFFICIALS_GET_TEAM_OFFICIALS} from './types';

export const getTeamOfficials = (team) => {
  return apiGet(
      `/api/officials/team/${team}/list`,
      OFFICIALS_GET_TEAM_OFFICIALS,
  );
};
