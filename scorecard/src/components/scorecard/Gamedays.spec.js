import React from "react";
import { shallow } from "enzyme";
import Gamedays from "./Gamedays";

const setup = (props = {}) => {
  const component = shallow(<Gamedays {...props} />);
  return component;
};

describe("Gamedays Component", () => {
  let component;
  let mockFunc;
  beforeEach(() => {
    mockFunc = jest.fn();
    component = setup({
      gamedays: [{ id: 0, date: "date", name: "Test Gameday" }],
      onClick: mockFunc,
    });
  });
  it("It should render without erros", () => {
    const wrapper = component.find("h3");
    expect(wrapper.length).toBe(1);
  });

  it("Should emit callback on click event", () => {
    const button = component.find("button").at(0);
    button.simulate("click");
    const callback = mockFunc.mock.calls.length;
    expect(callback).toBe(1);
  });
});
