import SelectGame from "../SelectGame";
import { testStore } from "../../../__tests__/Utils";
import React from "react";
import { MemoryRouter as Router, Route, Routes } from "react-router-dom";
import { TWO_GAMEDAYS } from "../../../__tests__/testdata/gamedaysData";
import { TWO_GAMES } from "../../../__tests__/testdata/gamesData";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OFFICIALS_URL } from "../../common/urls";

import { apiGet } from "../../../actions/utils/api";
import { GET_GAMEDAYS, GET_GAMES } from "../../../actions/types";
import { Provider } from "react-redux";

jest.mock("../../../actions/utils/api");
apiGet.mockImplementation((...params) => (dispatch) => {
  const actionType = params[1];
  if (actionType == GET_GAMEDAYS) {
    return () => {};
  }
  dispatch({
    type: GET_GAMES,
    payload: TWO_GAMES.games,
  });
});

const pageText = "Officials Page";
let store;

const setup = () => {
  apiGet.mockClear();
  const initialState = {
    gamedaysReducer: {
      ...TWO_GAMEDAYS,
    },
    gamesReducer: {
      games: [],
    },
    authReducer: {
      user: {
        username: "OfficialsTeam",
      },
    },
  };
  store = testStore(initialState);
  render(
    <Provider store={store}>
      <Router initialEntries={[{ pathname: "/" }]}>
        <Routes>
          <Route path="/" element={<SelectGame store={store} />} />
          <Route path={OFFICIALS_URL} element={<div>{pageText}</div>} />
        </Routes>
      </Router>
    </Provider>,
  );
};

describe("SelectGame component", () => {
  it("it should render correct with empty games", () => {
    setup();
    expect(screen.getAllByRole("button").length).toBe(2);
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });
  it("should redirect to officials page", async () => {
    const user = userEvent.setup();
    setup();
    expect(apiGet.mock.calls[0][0]).toBe("/api/gameday/list");
    expect(screen.queryByText(pageText)).not.toBeInTheDocument();

    const secondSelectGamedayButton = screen.getAllByRole("button")[1];
    await user.click(secondSelectGamedayButton);
    expect(screen.getAllByRole("button").length).toBe(4);
    expect(screen.getAllByRole("table")).toHaveLength(2);

    const firstStartGameButton = screen.getAllByRole("button", {
      name: /start/i,
    })[0];
    await user.click(firstStartGameButton);
    expect(apiGet.mock.calls[1][0]).toBe(
      // eslint-disable-next-line max-len
      `/api/scorecard/gameday/${TWO_GAMEDAYS.gamedays[1].id}`,
    );
    expect(apiGet.mock.calls[2][0]).toBe(
      `/api/game/${TWO_GAMES.games[0].id}/officials`,
    );
    expect(apiGet.mock.calls[3][0]).toBe(
      `/api/game/${TWO_GAMES.games[0].id}/setup`,
    );
    expect(apiGet.mock.calls[4][0]).toBe(
      `/api/officials/team/${TWO_GAMES.games[0].officialsId}/list`,
    );
    const selectedGameStateInStore = store.getState().gamesReducer.selectedGame;
    expect(selectedGameStateInStore).toEqual(TWO_GAMES.games[0]);
    expect(screen.getByText(pageText)).toBeInTheDocument();
  });
});
