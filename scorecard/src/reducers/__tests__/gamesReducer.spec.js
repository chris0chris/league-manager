import { GET_GAMES } from "../../actions/types";
import gamesReducer from "../gamesReducer";

describe("Games Reducer", () => {
  it("Should return empty games", () => {
    const newState = gamesReducer(undefined, {});
    expect(newState).toEqual({
      games: [],
    });
  });

  it("Should return new state if receiving type", () => {
    const games = {
      games: [
        {
          id: 1,
        },
      ],
    };
    const newState = gamesReducer(undefined, {
      type: GET_GAMES,
      payload: games.games,
    });
    expect(newState).toEqual(games);
  });
});
