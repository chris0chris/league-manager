import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';

import {apiGet} from '../../../actions/utils/api';
import Details from '../Details';
import {GAME_LOG} from '../../../__tests__/testdata/gameLogData';
import {GET_GAME_LOG} from '../../../actions/types';

jest.mock('../../../actions/utils/api');
apiGet.mockImplementation((...params) => (dispatch) => {
  // const actionType = params[1];
  // if (actionType == GET_GAMEDAYS) {
  //   return () => {};
  // }
  dispatch({
    type: GET_GAME_LOG,
    payload: GAME_LOG,
  });
});

let store;

const setup = () => {
  apiGet.mockClear();
  const initialState = {
    gamesReducer: {
      gameLog: GAME_LOG,
    },
  };
  store = testStore(initialState);
  render(
      <Router>
        <Details store={store} />
        <Route path="/someUrl">Redirected Page</Route>
      </Router>,
  );
};

describe('Details component', () => {
  it('should render correct', () => {
    setup();
    // expect(apiGet.mock.calls).toHaveLength(1);
    expect(
        screen.getByRole('radio', {
          name: new RegExp(`\\b${GAME_LOG.home.name}\\b`, 'i'),
        }),
    ).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG.home.score)).toBeInTheDocument();
    expect(
        screen.getByRole('radio', {
          name: new RegExp(`\\b${GAME_LOG.away.name}\\b`, 'i'),
        }),
    ).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG.away.name)).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG.away.score)).toBeInTheDocument();

    expect(
        screen.getByRole('button', {name: 'Halbzeit'}),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(5);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
