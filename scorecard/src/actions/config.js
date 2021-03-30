import {GET_PENALTIES} from './types';

import {apiGet} from './utils/api';

export const getPenalties = () => {
  return apiGet('/api/config/scorecard/penalties', GET_PENALTIES);
};
