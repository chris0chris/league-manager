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
import {GET_GAME_OFFICIALS} from '../../../actions/types';
import {GAME_OFFICIALS} from '../../../__tests__/testdata/gameSetupData';

const selectedGame = GAME_PAIR_1;
let areOfficialsEmpty = false;

jest.mock('../../../actions/utils/api');

apiPut.mockImplementation(() => {
  return () => {};
});
apiGet.mockImplementation((url, actionType) => (dispatch) => {
  if (actionType == GET_GAME_OFFICIALS && areOfficialsEmpty) {
    dispatch({
      type: GET_GAME_OFFICIALS,
      payload: [],
    });
  } else if (actionType == GET_GAME_OFFICIALS && !areOfficialsEmpty) {
    dispatch({
      type: GET_GAME_OFFICIALS,
      payload: GAME_OFFICIALS,
    });
  }
  return () => {};
});


const setup = (initOfficials=false) => {
  let initialOfficials = GAME_OFFICIALS;
  if (!initOfficials) {
    initialOfficials = [];
  }
  apiPut.mockClear();
  apiGet.mockClear();
  const initialState = {
    gamesReducer: {
      selectedGame: GAME_PAIR_1,
      gameSetupOfficials: initialOfficials,
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
    expect(apiGet.mock.calls[1][0]).toBe(`/api/gamelog/${selectedGame.id}`);
    expect(screen.getByText('Some Text')).toBeInTheDocument();
  });
  it('checks if buttons are checked when clicked', () => {
    setup();
    const wonButton = screen.getByRole('radio', {name: 'Gewonnen'});
    const lostButton = screen.getByText('Verloren');
    expect(wonButton).not.toBeChecked();
    expect(lostButton).not.toBeChecked();
    userEvent.click(wonButton);
    expect(wonButton).toBeChecked();
    expect(lostButton).not.toBeChecked();
  });
  it('should call getApi to init the page and display the officials name', () => {
    setup();
    expect(apiGet.mock.calls[0][0]).toBe(`/api/game/${selectedGame.id}/officials`);
    expect(screen.getByPlaceholderText('Scorecard Judge-Name')).toHaveDisplayValue('Sofia Scorecard');
    expect(screen.getByPlaceholderText('Referee-Name')).toHaveDisplayValue('Rebecca Referee');
    expect(screen.getByPlaceholderText('Down Judge-Name')).toHaveDisplayValue('Daniela Down');
    expect(screen.getByPlaceholderText('Field Judge-Name')).toHaveDisplayValue('Franziska Field');
    expect(screen.getByPlaceholderText('Side Judge-Name')).toHaveDisplayValue('Saskia Side');
  });
  it('should call getApi to init the page and display empty officials', () => {
    areOfficialsEmpty = true;
    setup(areOfficialsEmpty);
    expect(apiGet.mock.calls[0][0]).toBe(`/api/game/${selectedGame.id}/officials`);
    expect(screen.getByPlaceholderText('Scorecard Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Referee-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Down Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Field Judge-Name')).toHaveDisplayValue('');
    expect(screen.getByPlaceholderText('Side Judge-Name')).toHaveDisplayValue('');
  });
});
