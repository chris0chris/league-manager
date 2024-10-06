export const DASHBOARD_URL = "/dashboard";
export const LOGIN_URL = "/login";
export const OFFICIALS_URL = "/officials";
export const ROOT_URL = "/";
export const SELECT_APP_URL = "/select-app";
export const SELECT_GAME_URL = "/select-game";

export const stringToBoolean = (value: string | null): boolean => {
  if (!value || value === "false") {
    return false;
  }
  return true;
};
