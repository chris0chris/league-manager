/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../../layout/RadioButton';
import Turnover from './Turnover';
import InputWithNumber from './InputWithNumber';

const Series = (props) => {
  const {update} = props;
  const SERIES_GROUP_NAME = 'series';
  const [showSafety, setShowSafety] = useState(false);
  const [showGameTime, setShowGameTime] = useState(false);
  const [showPenalty, setShowPenalty] = useState(true);
  const handleGameEventSelection = (value) => {
    switch (value) {
      case 'Interception':
        setShowStates(false, true, false);
        break;
      case 'Turnover':
        setShowStates(true, false, false);
        break;
      default:
        setShowStates(false, false, true);
        break;
    }
  };
  const setShowStates = (turnover, gameTime, penalty) => {
    setShowSafety(turnover);
    setShowGameTime(gameTime);
    setShowPenalty(penalty);
  };
  return (
    <div>
      <div className="row mt-2">
        <RadioButton color='secondary' name={SERIES_GROUP_NAME} onChange={handleGameEventSelection} id='turnover' text='Turnover' checked={showSafety} value='Turnover'/>
        <RadioButton color='secondary' name={SERIES_GROUP_NAME} onChange={handleGameEventSelection} id='interception' text='INT' checked={showGameTime} value='Interception'/>
        <RadioButton color='secondary' name={SERIES_GROUP_NAME} onChange={handleGameEventSelection} id='firstdown' text='1st' checked={showPenalty} value='FirstDown'/>
      </div>
      {
        showSafety &&
      <Turnover update={update} />
      }
      { showGameTime &&
      <InputWithNumber update={update} label="Interception" isOpponentAction={true} />
      }
      { showPenalty &&
      <InputWithNumber update={update} label="First Down" isOpponentAction={false}/>
      }
    </div>
  );
};

Series.propTypes = {
  update: PropTypes.func.isRequired,
};

export default Series;
