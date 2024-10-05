import { GameSetup } from "../../types/gameSetup.types";
import { axiosGet } from "./axiosApi";

export const loadGameSetup = async (gameId: number): Promise<GameSetup> => {
  return axiosGet(`api/scorecard/game/${gameId}/setup`);
};
