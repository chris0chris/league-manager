import {GET_LIVETICKER} from './types';

import {apiGet} from './utils/api';

export const getLiveticker = (gameIds, league) => {
  return apiGet(
      `/api/liveticker?getAllTicksFor=${JSON.stringify(gameIds)}&league=${league}`,
      GET_LIVETICKER);
};
