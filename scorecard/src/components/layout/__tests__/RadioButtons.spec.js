import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RadioButtons from "../RadioButtons";

let mockFunk = jest.fn();

const setup = (value = undefined) => {
  mockFunk.mockClear();
  const initialState = {
    name: "groupName",
    onChange: mockFunk,
    buttonInfos: [
      { id: "idFirstButton", text: "textFirstButton", value: value },
      { id: "idSecondButton", text: "textSecondButton", value: value },
    ],
  };
  render(<RadioButtons {...initialState} />);
};

describe("RadioButtons component", () => {
  it("should render component", () => {
    setup();
    const allButtons = screen.getAllByRole("radio");
    expect(allButtons.length).toBe(2);

    const firstButton = allButtons[0];
    expect(firstButton).not.toBeChecked();
    expect(firstButton).toBeInvalid();
    expect(screen.getByLabelText("textFirstButton")).toBeInTheDocument();

    const secondButton = allButtons[1];
    expect(secondButton).not.toBeChecked();
    expect(secondButton).toBeInvalid();
    expect(screen.getByLabelText("textSecondButton")).toBeInTheDocument();
  });

  it("should propagate the correct implicit value", () => {
    setup();
    userEvent.click(screen.getByText("textFirstButton"));
    expect(mockFunk.mock.calls[0][0]).toBe("textFirstButton");
  });
  it("should propagate the correct explicit value", () => {
    setup("someValue");
    userEvent.click(screen.getByText("textFirstButton"));
    expect(mockFunk.mock.calls[0][0]).toBe("someValue");
  });
});
