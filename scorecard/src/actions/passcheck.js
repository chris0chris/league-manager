import {GET_PASSCHECK_STATUS} from './types';
import {apiGet} from './utils/api';

export const getPasscheckStatus = () => {
  return apiGet(`${window.location.origin}/api/passcheck/games/status`, GET_PASSCHECK_STATUS);
};
