export const ROOT_URL = "/";
export const SELECT_APP_URL = "/select-app";
export const LOGIN_URL = "/login";
export const SELECT_GAME_URL = "/select-game";
export const OFFICIALS_URL = "/officials";

export const stringToBoolean = (value: string | null): boolean => {
  if (!value || value === "false") {
    return false;
  }
  return true;
};
