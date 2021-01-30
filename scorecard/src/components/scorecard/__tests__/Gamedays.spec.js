import React from "react";
import { shallow } from "enzyme";
import Gamedays from "../Gamedays";
import { ONE_GAMEDAY } from "../../../__tests__/testdata/gamedaysData";

let mockFunc = jest.fn();

const setup = () => {
  const initialState = {
    ...ONE_GAMEDAY,
    onClick: mockFunc,
  };
  const component = shallow(<Gamedays {...initialState} />);
  return component;
};

describe("Gamedays Component", () => {
  it("It should render without erros", () => {
    let component = setup();
    const wrapper = component.find("[data-testid='row-entry']");
    expect(wrapper.length).toBe(1);
  });

  it("Should emit callback on click event", () => {
    let component = setup();
    const button = component.find("button").at(0);
    button.simulate("click");
    const callback = mockFunc.mock.calls.length;
    expect(callback).toBe(1);
  });
});
