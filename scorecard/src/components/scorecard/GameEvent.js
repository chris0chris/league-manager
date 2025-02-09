
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';
import Safety from './Safety';
import GameTime from './gameEvent/GameTime';
import Penalty from './gameEvent/Penalty';
import InputWithNumber from './gameEvent/InputWithNumber';

const GameEvent = (props) => {
  const { update } = props;
  const [showSafety, setShowSafety] = useState(false);
  const [showGameTime, setShowGameTime] = useState(false);
  const [showPenalty, setShowPenalty] = useState(true);
  const [showOvertime, setShowOvertime] = useState(false);
  const handleGameEventSelection = (value) => {
    switch (value) {
      case 'GameTime':
        setShowStates(false, true, false, false);
        break;
      case 'Penalty':
        setShowStates(false, false, true, false);
        break;
      case 'Overtime':
        setShowStates(false, false, false, true);
        break;
      default:
        setShowStates(true, false, false, false);
        break;
    }
  };
  const setShowStates = (turnover, gameTime, penalty, overtime) => {
    setShowSafety(turnover);
    setShowGameTime(gameTime);
    setShowPenalty(penalty);
    setShowOvertime(overtime);
  };
  return (
    <div className='form-control'>
      <div className="row mt-2">
        <div className="col-6">
          <RadioButton color='secondary' name='gameEvent' onChange={handleGameEventSelection}
            id='penalty' text='Strafe' checked={showPenalty} value='Penalty' />
        </div>
        <div className="col-6">
          <RadioButton color='secondary' name='gameEvent' onChange={handleGameEventSelection}
            id='gameTime' text='Zeit' checked={showGameTime} value='GameTime' />
        </div>
        <div className="col-6 mt-2">
          <RadioButton color='warning' name='gameEvent' onChange={handleGameEventSelection}
            id='safety' text='Safety' checked={showSafety} value='Safety' />
        </div>
        <div className="col-6 mt-2">
          <RadioButton color='warning' name='gameEvent' onChange={handleGameEventSelection}
            id='overtime' text='OT' checked={showOvertime} value='Overtime' />
        </div>
      </div>
      {
        showSafety &&
        <Safety update={update} />
      }
      {showGameTime &&
        <GameTime update={update} />
      }
      {showPenalty &&
        <Penalty update={update} />
      }
      {showOvertime &&
        <InputWithNumber update={update} isOpponentAction={false} label="Overtime" isRequired={true} />
      }
    </div>
  );
};

GameEvent.propTypes = {
  update: PropTypes.func.isRequired,
};

export default GameEvent;
