import React from "react";
import { shallow } from "enzyme";
import Gamedays from "./Gamedays";

const setup = (props = {}) => {
  const component = shallow(<Gamedays {...props} />);
  return component;
};

describe("Gamedays Component", () => {
  let component;
  beforeEach(() => {
    component = setup({ gamedays: [], onClick: () => {} });
  });
  it("It should render without erros", () => {
    const wrapper = component.find("h3");
    expect(wrapper.length).toBe(1);
  });
});
