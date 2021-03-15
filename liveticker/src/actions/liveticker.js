import {GET_LIVETICKER} from './types';

import {apiGet} from './utils/api';

export const getLiveticker = () => {
  return apiGet('/api/liveticker', GET_LIVETICKER);
};
