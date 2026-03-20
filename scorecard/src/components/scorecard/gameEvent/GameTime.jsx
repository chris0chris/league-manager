import React, {useState} from 'react';
import PropTypes from 'prop-types';

const GameTime = (props) => {
  const {update} = props;
  const [gameTimeMinutes, setGameTimeMinutes] = useState('');
  const [gameTimeSeconds, setGameTimeSeconds] = useState('');
  update({
    event: [
      {name: 'Spielzeit', input: `${gameTimeMinutes}:${gameTimeSeconds}`},
    ],
  });
  return (
    <div className='mt-2'>
      <div className='row'>
        <div>restliche Spielzeit:</div>
      </div>
      <div className='row mt-2'>
        <div className='col'>
          <input
            type='number'
            max='19'
            min='0'
            className='form-control text-end'
            placeholder='Minuten'
            value={gameTimeMinutes}
            onChange={(ev) => setGameTimeMinutes(ev.target.value)}
            required
          />
        </div>
        <div className='col'>
          <input
            type='number'
            max='59'
            min='0'
            className='form-control'
            placeholder='Sekunden'
            value={gameTimeSeconds}
            onChange={(ev) => setGameTimeSeconds(ev.target.value)}
            required
          />
        </div>
      </div>
    </div>
  );
};

GameTime.propTypes = {
  update: PropTypes.func.isRequired,
};

export default GameTime;
