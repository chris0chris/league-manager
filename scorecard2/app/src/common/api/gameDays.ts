import { GamedaysOverview } from "../../types";
import { axiosGet } from "./axiosApi";

export const loadGamedays = async (): Promise<GamedaysOverview> => {
  return axiosGet("/api/scorecard/gameday/list");
};

export const loadGamesForGameday = async (
  gamedayId: number,
): Promise<GamedaysOverview> => {
  return axiosGet(`/api/scorecard/gameday/${gamedayId}`);
};
