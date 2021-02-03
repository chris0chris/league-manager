import { GET_GAMEDAYS } from "./types";

import { api_get } from "./helper/api";

export const getGamedays = () => {
  return api_get("/api/gameday/list", GET_GAMEDAYS);
};
