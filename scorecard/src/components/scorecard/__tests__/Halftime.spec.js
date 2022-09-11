/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Halftime from '../Halftime';
import {GAME_LOG_ONLY_FIRSTHALF} from '../../../__tests__/testdata/gameLogData';
import $ from 'jquery/src/jquery';
import {testStore} from '../../../__tests__/Utils';
import {apiGet} from '../../../actions/utils/api';
import {GET_GAME_SETUP} from '../../../actions/types';

const submitMock = jest.fn();
const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});

jest.mock('../../../actions/utils/api');
apiGet.mockImplementation(() => (dispatch) => {
  dispatch({
    type: GET_GAME_SETUP,
    payload: {
      ctResult: 'won',
      direction: 'directionLeft',
      fhPossession: GAME_LOG_ONLY_FIRSTHALF.away.name,
    },
  });
});

const setup = (isFirstHalf = true) => {
  const initialState = {
    gamesReducer: {
      gameLog: GAME_LOG_ONLY_FIRSTHALF,
      gameSetup: {
        ctResult: '',
        direction: '',
        fhPossession: '',
      },
    },
  };
  const store = testStore(initialState);
  modalMock.mockClear();
  submitMock.mockClear();
  apiGet.mockClear();
  render(<Halftime store={store} gameLog={GAME_LOG_ONLY_FIRSTHALF} isFirstHalf={isFirstHalf} onSubmit={submitMock}/>);
};

describe('Halftime component', () => {
  it('should render correct halftime', () => {
    setup();
    expect(screen.getAllByTestId('timeoutButton')).toHaveLength(4);
    expect(screen.getByRole('button', {name: 'Halbzeit'})).toBeInTheDocument();
  });
  it('should render correct final', () => {
    setup(false);
    expect(screen.getAllByTestId('timeoutButton')).toHaveLength(4);
    expect(screen.getByRole('button', {name: 'Ende'})).toBeInTheDocument();
  });
  it('should set half, when halftime button and done is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', {name: 'Halbzeit'}));
    expect(apiGet.mock.calls[0][0]).toBe(`/api/game/${GAME_LOG_ONLY_FIRSTHALF.gameId}/setup`);
    expect(screen.getByText(GAME_LOG_ONLY_FIRSTHALF.home.name)).toBeInTheDocument();
    expect(screen.getByTitle('directionLeft')).toBeInTheDocument();
    await user.click(screen.getByTestId('halftime-done'));
    expect(submitMock.mock.calls[0][0]).toBe(true);
  });
  it('should send false, when final button is clicked', async () => {
    const user = userEvent.setup();
    setup(false);
    await user.click(screen.getByRole('button', {name: 'Ende'}));
    expect(submitMock.mock.calls[0][0]).toBe(false);
  });
  it('should do nothing, when halftime button and cancel is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', {name: 'Halbzeit'}));
    await user.click(screen.getByTestId('halftime-cancel'));
    expect(submitMock.mock.calls).toHaveLength(0);
  });
});
