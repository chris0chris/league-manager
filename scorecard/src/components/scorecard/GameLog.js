/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import ScorecardTable from './ScorecardTable';

const GameLog = ({homeHalf, awayHalf, isFirstHalf, displayHome, displayBothTeams}) => {
  return (
    <>
      {isFirstHalf &&
      <div className="row mt-2">
        <div className="text-center">1. Halbzeit
          <span className="fw-bold" data-testid='home-fh'>{homeHalf.score}</span>{' : '}
          <span className="fw-bold" data-testid='away-fh'>{awayHalf.score}</span></div>
      </div>}
      <div className='row'>
        { (displayBothTeams || displayHome) &&
        <div className='col'>
          <ScorecardTable
            entries={homeHalf.entries}
          />
        </div>}
        { (displayBothTeams || !displayHome) &&
        <div className='col'>
          <ScorecardTable
            entries={awayHalf.entries}
          />
        </div>}
      </div>
    </>
  );
};

GameLog.propTypes = {
  homeHalf: PropTypes.object.isRequired,
  awayHalf: PropTypes.object.isRequired,
  isFirstHalf: PropTypes.bool.isRequired,
};

export default GameLog;
