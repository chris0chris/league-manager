/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';

const InputWithNumber = (props) => {
  const {update, label, isOpponentAction, isRequired=false} = props;
  const [playerNumber, setPlayerNumber] = useState('');

  update({
    event: [{name: label, player: playerNumber}],
  }, isOpponentAction);
  return (
    <>
      <div>
        <div className='mt-2' style={{position: 'relative'}}>
          <div className='input-group'>
            <div className='input-group-text'>
            #
            </div>
            <input
              type='number'
              className='form-control'
              placeholder={isRequired ? `${label} - Trikotnummer` : `${label} - Nummer optional`}
              aria-label='number'
              onChange={(ev) => setPlayerNumber(ev.target.value)}
              value={playerNumber}
              required={isRequired}
            />
          </div>
        </div>
      </div>
    </>
  );
};

InputWithNumber.propTypes = {
  update: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  isOpponentAction: PropTypes.bool.isRequired,
  isRequired: PropTypes.bool,
};

export default InputWithNumber;
