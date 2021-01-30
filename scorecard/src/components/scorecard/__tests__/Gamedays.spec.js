import React from "react";
// import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Gamedays from "../Gamedays";
import { ONE_GAMEDAY } from "../../../__tests__/testdata/gamedaysData";

let mockFunc = jest.fn();

const setup = () => {
  const initialState = {
    ...ONE_GAMEDAY,
    onClick: mockFunc,
  };
  const component = render(<Gamedays {...initialState} />);
  return component;
};

describe("Gamedays component", () => {
  it("should render component", () => {
    setup();
    expect(screen.getAllByRole("row").length).toBe(2);
  });

  it("should emit callback on click event", () => {
    setup();
    userEvent.click(screen.getByRole("button"));
    expect(mockFunc.mock.calls.length).toBe(1);
  });
});
