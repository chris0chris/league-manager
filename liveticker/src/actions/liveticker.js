import {GET_LIVETICKER} from './types';

import {apiGet} from './utils/api';

export const getLiveticker = (gameIds) => {
  return apiGet(
      `/api/liveticker?getAllTicksFor=${JSON.stringify(gameIds)}`,
      GET_LIVETICKER);
};
