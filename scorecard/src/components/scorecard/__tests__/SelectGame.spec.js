import SelectGame from "../SelectGame";
// import { shallow } from "enzyme";
import { testStore } from "../../../__tests__/Utils";
import React from "react";
import { HashRouter as Router, Route } from "react-router-dom";
import { TWO_GAMEDAYS } from "../../../__tests__/testdata/gamedaysData";
import { TWO_GAMES } from "../../../__tests__/testdata/gamesData";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OFFICIALS_URL } from "../../common/urls";

import { api_get } from "../../../actions/helper/api";
import { GET_GAMEDAYS, GET_GAMES } from "../../../actions/types";

jest.mock("../../../actions/helper/api");
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

let container;
const page_text = "Officials Page";
let store;

const setup = () => {
  api_get.mockClear();
  const initialState = {
    gamedaysReducer: {
      ...TWO_GAMEDAYS,
    },
  };
  store = testStore(initialState);
  container = render(
    <Router>
      <SelectGame store={store} />
      <Route path={OFFICIALS_URL}>{page_text}</Route>
    </Router>
  );
};

describe("SelectGame component", () => {
  it("it should render correct", () => {
    setup();
    expect(screen.getAllByRole("button").length).toBe(2);
    api_get.cl;
  });

  it("should redirect to officials page", () => {
    setup();
    const firstMockCall = api_get.mock.calls[0][0];
    expect(firstMockCall).toBe("/api/gameday/list");
    expect(screen.queryByText(page_text)).toBeFalsy();

    const secondSelectGamedayButton = screen.getAllByRole("button")[1];
    userEvent.click(secondSelectGamedayButton);
    expect(screen.getAllByRole("button").length).toBe(4);

    const firstStartGameButton = screen.getAllByRole("button", {
      name: /start/i,
    })[0];
    userEvent.click(firstStartGameButton);
    const secondMockCall = api_get.mock.calls[1][0];
    expect(secondMockCall).toBe(
      `/api/gameday/${TWO_GAMEDAYS.gamedays[1].id}/details?get=schedule&orient=records`
    );
    const selectedGameStateInStore = store.getState().gamesReducer.selectedGame;
    expect(selectedGameStateInStore).toEqual(TWO_GAMES.games[0]);
    expect(screen.getByText(page_text)).toBeTruthy();
  });
});
