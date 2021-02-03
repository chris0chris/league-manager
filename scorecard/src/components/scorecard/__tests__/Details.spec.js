import { testStore } from "../../../__tests__/Utils";
import React from "react";
import { HashRouter as Router, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api_get } from "../../../actions/utils/api";
import Details from "../Details";
import { GAME_PAIR_1 } from "../../../__tests__/testdata/gamesData";

jest.mock("../../../actions/utils/api");
api_get.mockImplementation((...params) => (dispatch) => {
  const actionType = params[1];
  if (actionType == GET_GAMEDAYS) {
    return () => {};
  }
  dispatch({
    type: GET_GAMES,
    payload: TWO_GAMES.games,
  });
});

let store;

const setup = () => {
  api_get.mockClear();
  const initialState = {
    gamesReducer: {
      selectedGame: GAME_PAIR_1,
    },
  };
  store = testStore(initialState);
  render(
    <Router>
      <Details store={store} />
      <Route path="/">Redirected Page</Route>
    </Router>
  );
};

describe("Details component", () => {
  it("should render correct", () => {
    setup();
    expect(screen.getByText(GAME_PAIR_1.home)).toBeInTheDocument();
    expect(screen.getByText(GAME_PAIR_1.away)).toBeInTheDocument();
  });
});
