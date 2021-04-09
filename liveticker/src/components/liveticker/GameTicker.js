import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import TeamBox from './TeamBox';
import Ticks from './Ticks';
import {FaFootballBall} from 'react-icons/fa';

const GameTicker = (props) => {
  const {home, away, status, time, ticks} = props;
  const [isHomeInPossession, setIsHomeInPossession] = useState(true);
  useEffect(() => {
    for (let index = 0; index < ticks.length; index++) {
      const entry = ticks[index];
      if (entry.team) {
        console.log('found');
        setIsHomeInPossession(entry.team == 'home' ? true : false);
        console.log(entry.team, entry.team == 'home');
        return;
      }
    }
  }, [JSON.stringify(ticks)]);
  console.log('homeInPos?', isHomeInPossession);
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
          </div>
          <TeamBox img={away.img} name={away.name} />
        </div>
        <div className='row text-center'>
          <div className='col-4'>
            { isHomeInPossession &&
            <FaFootballBall size='17' />
            }
          </div>
          <div className="col-4 text-center">
            <span className='text-muted smaller'>({time} Uhr)</span>
          </div>
          <div className='col-4'>
            { !isHomeInPossession &&
              <FaFootballBall size='17' />
            }
          </div>
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
