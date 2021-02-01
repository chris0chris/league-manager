import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RadioButtons from "../RadioButtons";

const setup = () => {
  const initialState = {
    name: "groupName",
    buttonInfos: [
      { id: "idFirstButton", text: "textFirstButton" },
      { id: "idSecondButton", text: "textSecondButton" },
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
});
