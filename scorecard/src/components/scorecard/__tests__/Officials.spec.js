import React from "react";
import { HashRouter as Router, Route } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testStore } from "../../../__tests__/Utils";
import { GAME_PAIR_1 } from "../../../__tests__/testdata/gamesData";
import Officials from "../Officials";

let mockFunc = jest.fn();

const setup = () => {
  const initialState = {
    // gamedaysReducer: {
    //   ...TWO_GAMEDAYS,
    // },
    gamesReducer: {
      selectedGame: GAME_PAIR_1,
    },
  };
  const store = testStore(initialState);
  render(
    <Router>
      <Officials store={store} />
      <Route path="/someUrl">Some Text</Route>
    </Router>
  );
};

describe("Games component", () => {
  it("should render component", async () => {
    setup();
    const selectedGame = GAME_PAIR_1;
    expect(screen.getByRole("heading")).toHaveTextContent(
      `Feld ${selectedGame.field}: ${selectedGame.home} vs ${selectedGame.away}`
    );

    // userEvent.click(screen.getByText("Spiel starten"));
    // await waitFor(() => {
    //   expect(screen.getByText("Füllen Sie dieses Feld aus")).toBeVisible();
    // });
  });
});
