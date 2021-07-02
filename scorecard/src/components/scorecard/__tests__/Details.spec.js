/* eslint-disable max-len */
import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {apiGet, apiPost, apiPut} from '../../../actions/utils/api';
import Details from '../Details';
import {GAME_LOG_COMPLETE_GAME, GAME_LOG_ONLY_FIRSTHALF} from '../../../__tests__/testdata/gameLogData';
import $ from 'jquery/src/jquery';
import {FINALIZE_URL} from '../../common/urls';

const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});

jest.mock('../../../actions/utils/api');
apiPost.mockImplementation(() => {
  return () => {};
});
apiPut.mockImplementation(() => {
  return () => {};
});
apiGet.mockImplementation(() => {
  return () => {};
});

const setup = (gameLog = GAME_LOG_COMPLETE_GAME) => {
  apiPost.mockClear();
  apiPut.mockClear();
  apiGet.mockClear();
  const initialState = {
    gamesReducer: {
      gameLog: gameLog,
      deleteEntry: {__html: ''},
      gameSetup: {
        ctResult: '',
        direction: '',
        fhPossession: '',
      },
    },
  };
  const store = testStore(initialState);
  render(
      <Router>
        <Route path='' location={{search: `?start=${GAME_LOG_COMPLETE_GAME.away.name}`}} >
          <Details store={store} />
        </Route>
        <Route path={FINALIZE_URL}>Finalize Page</Route>
      </Router>,
  );
};

describe('Details component', () => {
  it('should render correct', () => {
    setup();
    const homeButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`),
    });
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).not.toBeChecked();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.home.score)).toBeInTheDocument();
    const awayButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`),
    });
    expect(awayButton).toBeInTheDocument();
    expect(awayButton).toBeChecked();
    expect(screen.getByText(GAME_LOG_COMPLETE_GAME.away.score)).toBeInTheDocument();

    expect(
        screen.getByRole('button', {name: 'Ende'}),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio').filter((node)=>node.name == 'points')).toHaveLength(3);
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
    expect(screen.getAllByRole('table').length).toBe(5);
  });
  it('should set the opposite team to be checked, when input was submitted', () => {
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
  it('should set focused opposite team, when turnover was submitted', () => {
    setup();
    const homeButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`, 'i')});
    const awayButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i')});
    expect(homeButton).not.toBeChecked();
    expect(awayButton).toBeChecked();
    expect(screen.getByText('Einträge Gast')).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', {name: /turnover/i}));
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(homeButton).toBeChecked();
    expect(awayButton).not.toBeChecked();
    /* [0][
      0 - "/api/gamelog/53",
      1 - {"event": [{"name": "Turnover"}], "gameId": 53, "half": 2, "team": "Away"},
      2 - "GET_GAME_LOG",
      3 - "GAME_CREATE_LOG_ENTRY_FAIL"] */
    expect(apiPost.mock.calls[0][1]['team']).toEqual('Away');

    expect(screen.getByText('Einträge Heim')).toBeInTheDocument();
  });

  it('should send a post api call with correct half, when points input was submitted', () => {
    setup();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(apiPost.mock.calls[0][0]).toBe(`/api/gamelog/${GAME_LOG_COMPLETE_GAME.gameId}`);
    expect(apiPost.mock.calls[0][1].half).toBe(2);
  });
  it('shoud send a put api call, when halftime button was clicked', () => {
    setup(GAME_LOG_ONLY_FIRSTHALF);
    userEvent.click(screen.getByRole('button', {name: 'Halbzeit'}));
    userEvent.click(screen.getByTestId('halftime-done'));
    expect(apiPut.mock.calls[0][0]).toBe(`/api/game/${GAME_LOG_ONLY_FIRSTHALF.gameId}/halftime`);
    expect(apiPut.mock.calls[1][0]).toBe(`/api/game/${GAME_LOG_ONLY_FIRSTHALF.gameId}/possession`);
    expect(screen.getByRole('button', {name: 'Ende'})).toBeInTheDocument();
  });
  it('should redirect ton finalize page, when final button is clicked', () => {
    setup();
    userEvent.click(screen.getByRole('button', {name: 'Ende'}));
    expect(screen.getByText('Finalize Page')).toBeInTheDocument();
  });
  it('should enable taken timeouts, when second half starts', () => {
    setup(GAME_LOG_ONLY_FIRSTHALF);
    userEvent.click(screen.getAllByTestId('timeoutButton')[0]);
    userEvent.type(screen.getAllByPlaceholderText('Minuten')[0], '00');
    userEvent.type(screen.getAllByPlaceholderText('Sekunden')[0], '01');
    userEvent.click(screen.getAllByRole('button', {name: 'Fertig'})[0]);
    expect(screen.getAllByTestId('timeoutButton')[0]).toBeDisabled();
    userEvent.click(screen.getByRole('button', {name: 'Halbzeit'}));
    userEvent.click(screen.getByTestId('halftime-done'));
    expect(screen.getAllByTestId('timeoutButton')[0]).toBeEnabled();
  });
});
