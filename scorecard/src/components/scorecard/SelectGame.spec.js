import SelectGame from "./SelectGame";
import { shallow } from "enzyme";
import { testStore } from "../../__tests__/Utils";
import React from "react";

const setup = (initialState = {}) => {
  const store = testStore(initialState);
  const wrapper = shallow(<SelectGame store={store} />)
    .childAt(0)
    .dive();
  console.log(wrapper.debug());
  return wrapper;
};

describe("SelectGame component", () => {
  let wrapper;
  beforeEach(() => {
    const initialState = {
      gamedaysReducer: {
        gamedays: [
          {
            date: "2020-07-12",
            name: "Test Gameday",
          },
          {
            date: "2020-07-12",
            name: "Test Gameday",
          },
        ],
      },
      gamesReducer: {
        games: [
          // {
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          // },
          // {
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          // },
          // {
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          //   irgendwas: "sdf",
          // },
        ],
      },
    };
    wrapper = setup(initialState);
  });

  it("Should render without erros", () => {});
});
