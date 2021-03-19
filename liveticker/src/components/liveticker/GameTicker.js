import React from 'react';
import PropTypes from 'prop-types';
import TeamBox from './TeamBox';
import Ticks from './Ticks';

const GameTicker = (props) => {
  const {home, away, status, time, ticks} = props;
  return (
    <div className='card mb-4'>
      <div className='card-header'>
        <div className='row'>
          <TeamBox img={home.img} name={home.name} />
          <div className='col-4 align-self-center text-center'>
            <span className='fs-2 fw-bold'>
              {home.score} - {away.score}
            </span>
            <br />
            <span className='fs-6'>{status}</span>
            <br />
            <span className='text-muted smaller'>({time} Uhr)</span>
          </div>
          <TeamBox img={away.img} name={away.name} />
        </div>
      </div>
      <Ticks entries={ticks} />
    </div>
  );
};

GameTicker.propTypes = {
  home: PropTypes.object.isRequired,
  away: PropTypes.object.isRequired,
  status: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  ticks: PropTypes.array.isRequired,
};

export default GameTicker;
