import React from 'react';
import {HashRouter as Router, Route} from 'react-router-dom';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {testStore} from '../../../__tests__/Utils';
import {GAME_PAIR_1} from '../../../__tests__/testdata/gamesData';
import Officials from '../Officials';
import {DETAILS_URL} from '../../common/urls';
import {apiGet, apiPost} from '../../../actions/utils/api';

jest.mock('../../../actions/utils/api');
apiPost.mockImplementation(() => {
  return () => {};
});
apiGet.mockImplementation(() => {
  return () => {};
});

const selectedGame = GAME_PAIR_1;

const setup = () => {
  const initialState = {
    gamesReducer: {
      selectedGame: GAME_PAIR_1,
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

    expect(apiPost.mock.calls[0][0]).toBe('/api/gamesetup/create');
    expect(apiPost.mock.calls[1][0]).toBe('/api/officials/create');
    expect(apiGet.mock.calls[0][0]).toBe(`/api/gamelog/${selectedGame.id}`);
    expect(screen.getByText('Some Text')).toBeInTheDocument();
  });
});
