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

let container;
const page_text = "Officials Page";

const setup = () => {
  const initialState = {
    gamedaysReducer: {
      ...TWO_GAMEDAYS,
    },
    gamesReducer: {
      ...TWO_GAMES,
    },
  };
  const store = testStore(initialState);
  container = render(
    <Router>
      <SelectGame store={store} />
      <Route path={OFFICIALS_URL}>{page_text}</Route>
    </Router>
  );
};

describe("SelectGame component", () => {
  it("should redirect to officials page", () => {
    setup();
    expect(screen.queryByText(page_text)).toBeFalsy();
    const firstStartButton = screen.getAllByRole("button", {
      name: /start/i,
    })[1];
    userEvent.click(firstStartButton);
    expect(screen.getByText(page_text)).toBeTruthy();

    // expect(container).toBeEmptyDOMElement();
    // expect(wrapper.find("Entry").length).toBe(4);
    // console.log(instance.debug());
  });
});
