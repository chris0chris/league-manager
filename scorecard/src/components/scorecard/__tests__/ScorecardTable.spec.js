import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG} from '../../../__tests__/testdata/gameLogData';
import ScorecardTable from '../ScorecardTable';

const setup = () => {
  render(<ScorecardTable entries={GAME_LOG.home.firsthalf.entries} />);
};

describe('ScorecardTable component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByText('#19')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });
});
