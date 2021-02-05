import SelectGame from '../SelectGame';
// import { shallow } from "enzyme";
import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {TWO_GAMEDAYS} from '../../../__tests__/testdata/gamedaysData';
import {TWO_GAMES} from '../../../__tests__/testdata/gamesData';

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {OFFICIALS_URL} from '../../common/urls';

import {apiGet} from '../../../actions/utils/api';
import {GET_GAMEDAYS, GET_GAMES} from '../../../actions/types';

jest.mock('../../../actions/utils/api');
apiGet.mockImplementation((...params) => (dispatch) => {
  const actionType = params[1];
  if (actionType == GET_GAMEDAYS) {
    return () => {};
  }
  dispatch({
    type: GET_GAMES,
    payload: TWO_GAMES.games,
  });
});

const pageText = 'Officials Page';
let store;

const setup = () => {
  apiGet.mockClear();
  const initialState = {
    gamedaysReducer: {
      ...TWO_GAMEDAYS,
    },
  };
  store = testStore(initialState);
  render(
      <Router>
        <SelectGame store={store} />
        <Route path={OFFICIALS_URL}>{pageText}</Route>
      </Router>,
  );
};

describe('SelectGame component', () => {
  it('it should render correct', () => {
    setup();
    expect(screen.getAllByRole('button').length).toBe(2);
    apiGet.cl;
  });

  it('should redirect to officials page', () => {
    setup();
    const firstMockCall = apiGet.mock.calls[0][0];
    expect(firstMockCall).toBe('/api/gameday/list');
    expect(screen.queryByText(pageText)).toBeFalsy();

    const secondSelectGamedayButton = screen.getAllByRole('button')[1];
    userEvent.click(secondSelectGamedayButton);
    expect(screen.getAllByRole('button').length).toBe(4);

    const firstStartGameButton = screen.getAllByRole('button', {
      name: /start/i,
    })[0];
    userEvent.click(firstStartGameButton);
    const secondMockCall = apiGet.mock.calls[1][0];
    expect(secondMockCall).toBe(
        // eslint-disable-next-line max-len
        `/api/gameday/${TWO_GAMEDAYS.gamedays[1].id}/details?get=schedule&orient=records`,
    );
    const selectedGameStateInStore = store.getState().gamesReducer.selectedGame;
    expect(selectedGameStateInStore).toEqual(TWO_GAMES.games[0]);
    expect(screen.getByText(pageText)).toBeTruthy();
  });
});
