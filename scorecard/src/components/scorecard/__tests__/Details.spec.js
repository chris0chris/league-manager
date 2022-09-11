/* eslint-disable max-len */
import {testStore} from '../../../__tests__/Utils';
import React from 'react';
import {MemoryRouter as Router, Route, Routes} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {apiGet, apiPost, apiPut} from '../../../actions/utils/api';
import Details from '../Details';
import {GAME_LOG_COMPLETE_GAME, GAME_LOG_ONLY_FIRSTHALF} from '../../../__tests__/testdata/gameLogData';
import $ from 'jquery/src/jquery';
import {DETAILS_URL, FINALIZE_URL} from '../../common/urls';

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
      <Router initialEntries={[{pathname: '/details', search: `?start=${GAME_LOG_COMPLETE_GAME.away.name}`}]}>
        <Routes>
          <Route path={DETAILS_URL} element={<Details store={store} />} />
          <Route path={FINALIZE_URL} element={<div>Finalize Page</div>} />
        </Routes>
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
    expect(screen.getByText(new RegExp('1. Halbzeit'))).toBeInTheDocument();
    expect(screen.getByTestId('home-fh').innerHTML).toBe('21');
    expect(screen.getByTestId('away-fh').innerHTML).toBe('0');
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('checkbox',
        {name: new RegExp('Zeige Einträge')})).toBeChecked();
  });

  it('should render both teams entries correct', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('checkbox',
        {name: new RegExp('Zeige Einträge')}));
    expect(screen.getAllByRole('table').length).toBe(5);
  });

  it('should set the opposite team to be checked, when input was submitted', async () => {
    const user = userEvent.setup();
    setup();
    const homeButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`, 'i')});
    const awayButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i')});
    expect(homeButton).not.toBeChecked();
    expect(awayButton).toBeChecked();
    expect(screen.getByText('Einträge Gast')).toBeInTheDocument();
    await user.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    await user.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    await user.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(homeButton).toBeChecked();
    expect(awayButton).not.toBeChecked();
    expect(screen.getByText('Einträge Heim')).toBeInTheDocument();
  });

  it('should set points for opposite team, when safety was submitted', async () => {
    const user = userEvent.setup();
    setup();
    const homeButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.home.name}\\b`, 'i')});
    const awayButton = screen.getByRole('radio', {
      name: new RegExp(`\\b${GAME_LOG_COMPLETE_GAME.away.name}\\b`, 'i')});
    expect(homeButton).not.toBeChecked();
    expect(awayButton).toBeChecked();
    expect(screen.getByText('Einträge Gast')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', {name: /serie/i}));
    await user.click(screen.getByRole('radio', {name: /int/i}));
    await user.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(homeButton).toBeChecked();
    expect(awayButton).not.toBeChecked();
    /* [0][
      0 - "/api/gamelog/53",
      1 - {"event": [{"name": "INT", "player": ""}], "gameId": 53, "half": 2, "team": "Home"},
      2 - "GET_GAME_LOG",
      3 - "GAME_CREATE_LOG_ENTRY_FAIL"] */
    expect(apiPost.mock.calls[0][1]['team']).toEqual('Home');

    expect(screen.getByText('Einträge Heim')).toBeInTheDocument();
  });

  it('should send a post api call with correct half, when points input was submitted', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    await user.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    await user.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(apiPost.mock.calls[0][0]).toBe(`/api/gamelog/${GAME_LOG_COMPLETE_GAME.gameId}`);
    expect(apiPost.mock.calls[0][1].half).toBe(2);
  });

  it('should send a put api call, when halftime button was clicked', async () => {
    const user = userEvent.setup();
    setup(GAME_LOG_ONLY_FIRSTHALF);
    await user.click(screen.getByRole('button', {name: 'Halbzeit'}));
    await user.click(screen.getByTestId('halftime-done'));
    expect(apiPut.mock.calls[0][0]).toBe(`/api/game/${GAME_LOG_ONLY_FIRSTHALF.gameId}/halftime`);
    expect(apiPut.mock.calls[1][0]).toBe(`/api/game/${GAME_LOG_ONLY_FIRSTHALF.gameId}/possession`);
    expect(screen.getByRole('button', {name: 'Ende'})).toBeInTheDocument();
  });

  it('should redirect ton finalize page, when final button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', {name: 'Ende'}));
    expect(screen.getByText('Finalize Page')).toBeInTheDocument();
  });

  it('should enable taken timeouts, when second half starts', async () => {
    const user = userEvent.setup();
    setup(GAME_LOG_ONLY_FIRSTHALF);
    await user.click(screen.getAllByTestId('timeoutButton')[0]);
    await user.type(screen.getAllByPlaceholderText('Minuten')[0], '00');
    await user.type(screen.getAllByPlaceholderText('Sekunden')[0], '01');
    await user.click(screen.getAllByRole('button', {name: 'Fertig'})[0]);
    expect(screen.getAllByTestId('timeoutButton')[0]).toBeDisabled();
    await user.click(screen.getByRole('button', {name: 'Halbzeit'}));
    await user.click(screen.getByTestId('halftime-done'));
    expect(screen.getAllByTestId('timeoutButton')[0]).toBeEnabled();
  });
});
