/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';
import Safety from './Safety';
import GameTime from './gameEvent/GameTime';
import Penalty from './gameEvent/Penalty';

const GameEvent = (props) => {
  const {update} = props;
  const [showSafety, setShowSafety] = useState(true);
  const [showGameTime, setShowGameTime] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const handleGameEventSelection = (value) => {
    switch (value) {
      case 'GameTime':
        setShowStates(false, true, false);
        break;
      case 'Penalty':
        setShowStates(false, false, true);
        break;
      default:
        setShowStates(true, false, false);
        break;
    }
  };
  const setShowStates = (turnover, gameTime, penalty) => {
    setShowSafety(turnover);
    setShowGameTime(gameTime);
    setShowPenalty(penalty);
  };
  return (
    <div className='form-control'>
      <div className="row mt-2">
        <RadioButton color='warning' name='gameEvent' onChange={handleGameEventSelection} id='safety' text='Safety' checked={showSafety} value='Safety'/>
        <RadioButton color='secondary' name='gameEvent' onChange={handleGameEventSelection} id='gameTime' text='Zeit' checked={showGameTime} value='GameTime'/>
        <RadioButton color='secondary' name='gameEvent' onChange={handleGameEventSelection} id='penalty' text='Strafe' checked={showPenalty} value='Penalty'/>
      </div>
      {
        showSafety &&
      <Safety update={update} />
      }
      { showGameTime &&
      <GameTime update={update} />
      }
      { showPenalty &&
      <Penalty update={update} />
      }
    </div>
  );
};

GameEvent.propTypes = {
  update: PropTypes.func.isRequired,
};

export default GameEvent;
