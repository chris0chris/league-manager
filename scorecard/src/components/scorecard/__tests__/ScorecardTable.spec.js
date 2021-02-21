/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import ScorecardTable from '../ScorecardTable';
import {testStore} from '../../../__tests__/Utils';

const setup = () => {
  const initialState = {
    gamesReducer: {
      deleteEntry: {},
    },
  };
  const store = testStore(initialState);
  render(<ScorecardTable store={store} entries={
    GAME_LOG_COMPLETE_GAME.home.firsthalf.entries.concat(
        GAME_LOG_COMPLETE_GAME.away.secondhalf.entries)} />);
};

describe('ScorecardTable component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByText('#19')).toHaveLength(3);
    expect(screen.getAllByText(new RegExp('#7'))).toHaveLength(4);
    // incomplete PAT
    expect(screen.getAllByText(new RegExp('-'))).toHaveLength(1);
    expect(screen.getAllByText('Turnover')).toHaveLength(2);
    expect(screen.getAllByText(new RegExp('Safety'))).toHaveLength(2);
    expect(screen.getAllByText('Safety')[0].parentNode).toHaveClass('text-decoration-line-through');
  });
});
