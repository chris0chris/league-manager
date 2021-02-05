import React from 'react';
import {render, screen} from '@testing-library/react';
import {TEAM_LOG} from '../../../__tests__/testdata/teamLogData';
import ScorecardTable from '../ScorecardTable';

const setup = () => {
  render(<ScorecardTable entries={TEAM_LOG.home.firsthalf} />);
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
