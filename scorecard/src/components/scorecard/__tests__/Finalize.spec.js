/* eslint-disable max-len */
import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {MemoryRouter as Router, Route, Routes} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {apiPut} from '../../../actions/utils/api';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import Finalize from '../Finalize';
import {DETAILS_URL, FINALIZE_URL} from '../../common/urls';
import $ from 'jquery/src/jquery';

const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});

jest.mock('../../../actions/utils/api');
apiPut.mockImplementation(() => {
  return () => {};
});

const setup = (gameLog = GAME_LOG_COMPLETE_GAME) => {
  apiPut.mockClear();
  const initialState = {
    gamesReducer: {
      gameLog: gameLog,
    },
  };
  const store = testStore(initialState);
  render(
      <Router initialEntries={[{pathname: '/finalize'}]}>
        <Routes>
          <Route path={FINALIZE_URL} element={<Finalize store={store} />} />
          <Route path={DETAILS_URL} element={<div>Details Page</div>} />
          <Route path='/' element={<div>SelectGame Page</div>} />
        </Routes>
      </Router>,
  );
};

describe('Finalize component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.home.name)).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.home.score)).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.away.name)).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.away.score)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Spielstand bearbeiten'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Ergebnis abschicken'})).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: 'Bestätigen'})).toHaveLength(2);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('should disable edit score button, when home confirm button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.home.name}-Captain Name*`), 'Home Captain');
    await user.click(screen.getByTestId('confirmHomeButton'));
    expect(screen.getByRole('button', {name: 'Spielstand bearbeiten'})).toBeDisabled();
    expect(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.home.name}-Captain Name*`)).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Zurück'})).toBeInTheDocument();
  });
  it('should disable edit score button, when away confirm button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.away.name}-Captain Name*`), 'Away Captain');
    await user.click(screen.getByTestId('confirmAwayButton'));
    expect(screen.getByRole('button', {name: 'Spielstand bearbeiten'})).toBeDisabled();
    expect(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.away.name}-Captain Name*`)).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Zurück'})).toBeInTheDocument();
  });
  it('should do nothing, when away captain is empty and confirm button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('confirmAwayButton'));
    expect(screen.getByRole('button', {name: 'Spielstand bearbeiten'})).not.toBeDisabled();
    expect(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.away.name}-Captain Name*`)).not.toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Zurück'})).not.toBeInTheDocument();
  });
  it('should display game log, when checkbox is activated', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getAllByRole('table')).toHaveLength(4);
  });
  it('should call apiPut, when submit final score button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.home.name}-Captain Name*`), 'Home Cptn');
    await user.type(screen.getByPlaceholderText(`${GAME_LOG_COMPLETE_GAME.away.name}-Captain Name*`), 'Away Cptn');
    await user.click(screen.getByRole('button', {name: 'Ergebnis abschicken'}));
    expect(apiPut.mock.calls[0][0]).toBe(`/api/game/${GAME_LOG_COMPLETE_GAME.gameId}/finalize`);
    expect(screen.getByText('SelectGame Page')).toBeInTheDocument();
  });
  it('should redirect to details page, when clicked on edit score button', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', {name: 'Spielstand bearbeiten'}));
    expect(screen.getByText('Details Page')).toBeInTheDocument();
  });
});
