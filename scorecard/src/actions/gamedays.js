import {GET_GAMEDAYS} from './types';

import {apiGet} from './utils/api';

export const getGamedays = () => {
  return apiGet('/api/gameday/list', GET_GAMEDAYS);
};
