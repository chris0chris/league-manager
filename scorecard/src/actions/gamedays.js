import { GET_GAMEDAYS } from "./types";

import { api_get } from "./utils/api";

export const getGamedays = () => {
  return api_get("/api/gameday/list", GET_GAMEDAYS);
};
