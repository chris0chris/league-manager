import React from "react";
import { shallow } from "enzyme";
import Gamedays from "../../../src/components/scorecard/Gamedays";

describe("Gamedays Component", () => {
  it("It should render without erros", () => {
    const component = shallow(<Gamedays gamedays={[]} onClick={() => {}} />);
    const wrapper = component.find("h3");
    expect(wrapper.length).toBe(1);
  });
});
