import { axiosGet } from "./axiosApi";

export const getPasscheckStatus = async (): Promise<boolean> => {
  const response = await axiosGet(
    `${window.location.origin}/api/passcheck/games/status`,
  );
  return response.completed;
};
