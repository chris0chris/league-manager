import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Games from "../Games";
import { THREE_GAMES } from "../../../__tests__/testdata/gamesData";

let mockFunc = jest.fn();

const setup = () => {
  const initialState = {
    ...THREE_GAMES,
    onClick: mockFunc,
  };
  const component = render(<Games {...initialState} />);
  return component;
};

describe("Games component", () => {
  it("should render component", () => {
    setup();
    expect(screen.getAllByRole("row").length).toBe(4);
  });

  it("should emit callback on click event", () => {
    setup();
    const firstRowButton = screen.getAllByRole("button")[0];
    userEvent.click(firstRowButton);
    expect(mockFunc.mock.calls.length).toBe(1);
    expect(mockFunc.mock.calls[0][0]).toBe(52);
  });
});
