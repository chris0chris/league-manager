import {GET_LIVETICKER} from './types';

import {apiGet} from './utils/api';

export const getLiveticker = () => {
  return apiGet('/api/gameday/list', GET_LIVETICKER);
};
