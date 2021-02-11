/* eslint-disable max-len */
import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {apiPost} from '../../../actions/utils/api';
import Details from '../Details';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';

jest.mock('../../../actions/utils/api');
apiPost.mockImplementation(() => {
  return () => {};
});

const setup = () => {
  apiPost.mockClear();
  const initialState = {
    gamesReducer: {
      gameLog: GAME_LOG_COMPLETE_GAME,
    },
  };
  const store = testStore(initialState);
  render(
      <Router>
        <Route path='' location={{search: `?start=${GAME_LOG_COMPLETE_GAME.away.name}`}} >
          <Details store={store} />
        </Route>
        <Route path='/someUrl'>Redirected Page</Route>
      </Router>,
  );
};

describe('Details component', () => {
  it('should render correct', () => {
    setup();
    // expect(apiGet.mock.calls).toHaveLength(1);
    expect(
        screen.getByRole('radio', {
          name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`, 'i'),
        }),
    ).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.home.score)).toBeInTheDocument();
    expect(
        screen.getByRole('radio', {
          name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i'),
        }),
    ).toBeInTheDocument();
    expect(
        screen.getByRole('radio', {
          name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i'),
        }),
    ).toBeChecked();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.away.name)).toBeInTheDocument();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.away.score)).toBeInTheDocument();

    expect(
        screen.getByRole('button', {name: 'Halbzeit'}),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp('1. Halbzeit'))).toBeInTheDocument();
    expect(screen.getByTestId('home-fh').innerHTML).toBe('21');
    expect(screen.getByTestId('away-fh').innerHTML).toBe('0');
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('checkbox',
        {name: new RegExp('Zeige Einträge')})).toBeChecked();
  });
  it('should render both teams entries correct', () => {
    setup();
    userEvent.click(screen.getByRole('checkbox',
        {name: new RegExp('Zeige Einträge')}));
    expect(screen.getAllByRole('table').length).toBe(4);
  });
  it('should set the opposit team to be checked, when input was submitted', () => {
    setup();
    const homeButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`, 'i')});
    const awayButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i')});
    expect(homeButton).not.toBeChecked();
    expect(awayButton).toBeChecked();
    expect(screen.getByText('Einträge Gast')).toBeInTheDocument();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(homeButton).toBeChecked();
    expect(awayButton).not.toBeChecked();
    expect(screen.getByText('Einträge Heim')).toBeInTheDocument();
  });
  it('should send a post api call, when input was submitted', () => {
    setup();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(apiPost.mock.calls[0][0]).toBe(`/api/gamelog/${GAME_LOG_COMPLETE_GAME.gameId}`);
  });
});
