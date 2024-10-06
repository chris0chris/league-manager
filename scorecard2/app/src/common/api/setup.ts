import { GameSetup, SelectedGameSetup } from "../../types/gameSetup.types";
import { axiosGet, axiosPut } from "./axiosApi";

export const loadGameSetup = async (gameId: number): Promise<GameSetup> => {
  return axiosGet(`api/scorecard/game/${gameId}/setup`);
};

export const saveGameSetup = async (
  gameId: number,
  selectedGameSetup: SelectedGameSetup,
): Promise<void> => {
  return axiosPut(`api/scorecard/game/${gameId}/setup`, selectedGameSetup);
};
