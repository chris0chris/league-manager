/* eslint-disable max-len */
import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {testStore} from '../../../__tests__/Utils';
import {GAME_PAIR_1} from '../../../__tests__/testdata/gamesData';
import Officials from '../Officials';
import {DETAILS_URL} from '../../common/urls';
import {apiGet, apiPut} from '../../../actions/utils/api';
import {GET_GAME_OFFICIALS, GET_GAME_SETUP} from '../../../actions/types';
import {GAME_OFFICIALS, GAME_SETUP} from '../../../__tests__/testdata/gameSetupData';

const selectedGame = GAME_PAIR_1;
let isInitEmpty = false;

jest.mock('../../../actions/utils/api');

apiPut.mockImplementation(() => {
  return () => {};
});
apiGet.mockImplementation((url, actionType) => (dispatch) => {
  if (actionType == GET_GAME_OFFICIALS && isInitEmpty) {
    dispatch({
      type: GET_GAME_OFFICIALS,
      payload: [],
    });
  } else if (actionType == GET_GAME_OFFICIALS && !isInitEmpty) {
    dispatch({
      type: GET_GAME_OFFICIALS,
      payload: GAME_OFFICIALS,
    });
  }
  if (actionType == GET_GAME_SETUP && isInitEmpty) {
    dispatch({
      type: GET_GAME_SETUP,
      payload: {},
    });
  } else if (actionType == GET_GAME_SETUP && !isInitEmpty) {
    dispatch({
      type: GET_GAME_SETUP,
      payload: {
        ctResult: 'Gewonnen',
        direction: 'directionRight',
        fhPossession: GAME_PAIR_1.away,
      },
    });
  }
  return () => {};
});


const setup = (isInitialEmpty=false) => {
  isInitEmpty = isInitialEmpty;
  let initialOfficials = GAME_OFFICIALS;
  let initialGameSetup = {
    ctResult: 'Gewonnen',
    direction: 'directionRight',
    fhPossession: GAME_PAIR_1.away,
  };
  if (!isInitialEmpty) {
    initialOfficials = [];
    initialGameSetup = {};
  }
  apiPut.mockClear();
  apiGet.mockClear();
  const initialState = {
    gamesReducer: {
      selectedGame: GAME_PAIR_1,
      gameSetupOfficials: initialOfficials,
      gameSetup: initialGameSetup,
    },
  };
  const store = testStore(initialState);
  render(
      <Router>
        <Officials store={store} />
        <Route path={DETAILS_URL}>Some Text</Route>
      </Router>,
  );
};

describe('Officials component', () => {
  it('should render component', async () => {
    setup();
    expect(screen.getByRole('heading')).toHaveTextContent(
        // eslint-disable-next-line max-len
        `Feld ${selectedGame.field}: ${selectedGame.home} vs ${selectedGame.away}`,
    );
    expect(screen.getAllByRole('textbox').length).toBe(5);
    expect(screen.getAllByRole('radio').length).toBe(6);
    expect(screen.getByTestId('ctTeam').textContent).toEqual(selectedGame.away);
  });
  it('submit form and redirects', () => {
    setup();
    userEvent.type(
        screen.getByPlaceholderText('Scorecard Judge-Name'),
        'SC Name',
    );
    userEvent.type(screen.getByPlaceholderText('Referee-Name'), 'R Name');
    userEvent.type(screen.getByPlaceholderText('Down Judge-Name'), 'DJ Name');
    userEvent.type(screen.getByPlaceholderText('Field Judge-Name'), 'FJ Name');
    userEvent.type(screen.getByPlaceholderText('Side Judge-Name'), 'SJ Name');
    userEvent.click(screen.getByText('Gewonnen'));
    userEvent.click(screen.getByText(selectedGame.home));
    userEvent.click(screen.getByTitle('directionLeft'));
    userEvent.click(screen.getByText('Spiel starten'));
    expect(apiPut.mock.calls[0][0]).toBe(`/api/game/${selectedGame.id}/setup`);
    expect(apiPut.mock.calls[1][0]).toBe(`/api/game/${selectedGame.id}/officials`);
    expect(apiGet.mock.calls[0][0]).toBe(`/api/game/${selectedGame.id}/officials`);
    expect(apiGet.mock.calls[1][0]).toBe(`/api/game/${selectedGame.id}/setup`);
    expect(apiGet.mock.calls[2][0]).toBe(`/api/gamelog/${selectedGame.id}`);
    expect(screen.getByText('Some Text')).toBeInTheDocument();
  });
  it('checks if buttons are checked when clicked', () => {
    setup(true);
    const wonButton = screen.getByRole('radio', {name: 'Gewonnen'});
    const lostButton = screen.getByText('Verloren');
    expect(wonButton).not.toBeChecked();
    expect(lostButton).not.toBeChecked();
    userEvent.click(wonButton);
    expect(wonButton).toBeChecked();
    expect(lostButton).not.toBeChecked();
  });
  it('should call getApi to init the page, display the officials name and game setup infos', () => {
    setup();
    expect(screen.getByPlaceholderText('Scorecard Judge-Name')).toHaveDisplayValue('Sofia Scorecard');
    expect(screen.getByPlaceholderText('Referee-Name')).toHaveDisplayValue('Rebecca Referee');
    expect(screen.getByPlaceholderText('Down Judge-Name')).toHaveDisplayValue('Daniela Down');
    expect(screen.getByPlaceholderText('Field Judge-Name')).toHaveDisplayValue('Franziska Field');
    expect(screen.getByPlaceholderText('Side Judge-Name')).toHaveDisplayValue('Saskia Side');
    expect(screen.getByRole('radio', {name: 'Gewonnen'})).toBeChecked();
    expect(screen.getByRole('radio', {name: selectedGame.away})).toBeChecked();
    expect(screen.getByTestId('directionRight')).toBeChecked();
  });
  it('should call getApi to init the page and display empty officials', () => {
    setup(true);
    expect(screen.getByPlaceholderText('Scorecard Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Referee-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Down Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Field Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Side Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByRole('radio', {name: 'Gewonnen'})).not.toBeChecked();
    expect(screen.getByRole('radio', {name: 'Verloren'})).not.toBeChecked();
    expect(screen.getByRole('radio', {name: selectedGame.away})).not.toBeChecked();
    expect(screen.getByRole('radio', {name: selectedGame.home})).not.toBeChecked();
    expect(screen.getByTestId('directionRight')).not.toBeChecked();
    expect(screen.getByTestId('directionLeft')).not.toBeChecked();
  });
});
