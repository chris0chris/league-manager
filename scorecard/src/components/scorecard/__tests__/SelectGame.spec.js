import SelectGame from "../SelectGame";
import { shallow } from "enzyme";
import { testStore } from "../../../__tests__/Utils";
import React from "react";
import { TWO_GAMEDAYS } from "../../../__tests__/testdata/gamedaysData";
import { TWO_GAMES } from "../../../__tests__/testdata/gamesData";

const setup = (initialState = {}) => {
  const store = testStore(initialState);
  const wrapper = shallow(<SelectGame store={store} />)
    .childAt(0)
    .dive();
  // console.log(wrapper.debug());
  return wrapper;
};

describe("SelectGame component", () => {
  let wrapper;
  beforeEach(() => {
    const initialState = {
      gamedaysReducer: {
        ...TWO_GAMEDAYS,
      },
      gamesReducer: {
        ...TWO_GAMES,
      },
    };
    wrapper = setup(initialState);
  });

  it("should render entries for gamedays and games", () => {
    // expect(wrapper.find("Entry").length).toBe(4);
    // console.log(instance.debug());
  });
});
