import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG} from '../../../__tests__/testdata/gameLogData';
import ScorecardTable from '../ScorecardTable';

const setup = () => {
  render(<ScorecardTable entries={GAME_LOG.home.firsthalf.entries.concat(
      GAME_LOG.away.secondhalf.entries)} />);
};

describe('ScorecardTable component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByText('#19')).toHaveLength(3);
    expect(screen.getAllByText(new RegExp('#7'))).toHaveLength(4);
    // incomplete PAT
    expect(screen.getAllByText(new RegExp('-'))).toHaveLength(1);
    expect(screen.getAllByText('Angriffswechsel')).toHaveLength(2);
    expect(screen.getAllByText(new RegExp('Safety'))).toHaveLength(2);
  });
});
