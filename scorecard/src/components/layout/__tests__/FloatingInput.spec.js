import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FloatingInput from "../FloatingInput";

const setup = () => {
  const initialState = {
    id: "someId",
    text: "someText",
    value: "",
    onChange: () => {},
  };
  render(<FloatingInput {...initialState} />);
};

describe("FloatingInput component", () => {
  it("should render component", () => {
    setup();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should validate correct", () => {
    setup();
    let inputElement = screen.getByPlaceholderText("someText");
    expect(inputElement).toBeInvalid();
    userEvent.type(inputElement, "some text");
    expect(inputElement).toBeValid();
  });
});
