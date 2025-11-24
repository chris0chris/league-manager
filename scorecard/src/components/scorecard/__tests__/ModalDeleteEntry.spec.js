
import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import userEvent from '@testing-library/user-event';
import ModalDeleteEntry from '../ModalDeleteEntry';
import {testStore} from '../../../__tests__/Utils';

import ScorecardTable from '../ScorecardTable';
import {Provider} from 'react-redux';
import {apiDelete} from '../../../actions/utils/api';
import { vi } from 'vitest';

vi.mock('../../../actions/utils/api');
apiDelete.mockImplementation(() => {
  return () => {};
});

const setup = () => {
  const initialState = {
    gamesReducer: {
      deleteEntry: {__html: ''},
      gameLog: GAME_LOG_COMPLETE_GAME,
    },
  };
  const store = testStore(initialState);
  render(<Provider store={store}>
    <ScorecardTable entries={GAME_LOG_COMPLETE_GAME.away.secondhalf.entries} />
    <ModalDeleteEntry />
  </Provider>);
};

describe('ModalDeleteEntry component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByRole('button', {name: 'Abbrechen'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Löschen'})).toBeInTheDocument();
  });
  it('should delete entry via api, when row is double clicked and delete button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.dblClick(screen.getAllByText('Turnover')[0]);
    await user.click(screen.getByRole('button', {name: 'Löschen'}));
    expect(apiDelete.mock.calls[0][0]).toBe(`/api/gamelog/${GAME_LOG_COMPLETE_GAME.gameId}`);
  });
});
