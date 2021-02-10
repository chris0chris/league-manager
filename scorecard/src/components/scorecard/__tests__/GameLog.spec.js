/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import GameLog from '../GameLog';

const setup = (showHomeTable=true, displayBothTeamLogs=false) => {
  render(<>
    <GameLog homeHalf={GAME_LOG_COMPLETE_GAME.away.secondhalf} awayHalf={GAME_LOG_COMPLETE_GAME.home.secondhalf}
      isFirstHalf={false} displayHome={showHomeTable} displayBothTeams={displayBothTeamLogs} />
    <GameLog homeHalf={GAME_LOG_COMPLETE_GAME.home.firsthalf} awayHalf={GAME_LOG_COMPLETE_GAME.away.firsthalf}
      isFirstHalf={true} displayHome={showHomeTable} displayBothTeams={displayBothTeamLogs}/>
  </>);
};

describe('ScorecardTable component', () => {
  it('should render correct one team', () => {
    setup();
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getAllByText('#19')).toHaveLength(3);
    expect(screen.getAllByText(new RegExp('#7'))).toHaveLength(4);
    // incomplete PAT
    expect(screen.getAllByText(new RegExp('-'))).toHaveLength(1);
    expect(screen.getAllByText('Turnover')).toHaveLength(2);
    expect(screen.getAllByText(new RegExp('Safety'))).toHaveLength(2);
  });
  it('should render correct both teams with displayHome true', () => {
    setup(true, true);
    expect(screen.getAllByRole('columnheader')).toHaveLength(16);
  });
  it('should render correct both teams with displayHome false', () => {
    setup(false, true);
    expect(screen.getAllByRole('columnheader')).toHaveLength(16);
  });
});
