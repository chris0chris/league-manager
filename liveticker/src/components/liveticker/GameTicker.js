/* eslint-disable max-len */
import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import TeamBox from './TeamBox';
import DisplayAllTicks from './DisplayAllTicks';
import Ticks from './Ticks';
import {MdRefresh} from 'react-icons/md';

const GameTicker = (props) => {
  const {home, away, status, standing, ticks, updateGamesToDisplay, gameIndex} = props;
  const [loadAllTicks, setLoadAllTicks] = useState(false);
  const time = new Date().toLocaleTimeString();
  useEffect(() => {
    if (loadAllTicks) {
      updateGamesToDisplay(gameIndex, true);
    } else {
      updateGamesToDisplay(gameIndex, false);
    }
  }, [loadAllTicks]);
  return (
    <div className='card mb-4'>
      <div className='card-header'>
        <div className='row'>
          <TeamBox img={home.img} name={home.name}
            showPossession={home.isInPossession} />
          <div className='col-4 align-self-center text-center'>
            <span className='text-muted smaller'>{standing}</span>
            <br/>
            <span className='fs-2 fw-bold'>
              {home.score} - {away.score}
            </span>
            <br />
            <span className='fs-6'>{status}</span>
            <br />
            <span className='text-muted smaller'><MdRefresh title='Letzte Aktualisierung' style={{marginBottom: '2px'}} />{time} Uhr</span>
          </div>
          <TeamBox img={away.img} name={away.name}
            showPossession={away.isInPossession} />
        </div>
      </div>
      <Ticks entries={ticks} />
      { ticks.length !== 0 &&
        <div className="card-footer text-center">
          <DisplayAllTicks loadAllTicks={loadAllTicks} setLoadAllTicks={setLoadAllTicks} />
        </div>
      }
    </div>
  );
};

GameTicker.propTypes = {
  home: PropTypes.object.isRequired,
  away: PropTypes.object.isRequired,
  status: PropTypes.string.isRequired,
  standing: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  ticks: PropTypes.array.isRequired,
  updateGamesToDisplay: PropTypes.func.isRequired,
  gameIndex: PropTypes.number.isRequired,
};

export default GameTicker;
