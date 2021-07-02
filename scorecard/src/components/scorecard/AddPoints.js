/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';
import Touchdown from './Touchdown';
import GameEvent from './GameEvent';
import Turnover from './gameEvent/Turnover';

const AddPoints = (props) => {
  let event = null;
  let isAgainstOpponent = false;
  const {onSubmit: updateParent} = props;
  const [showTD, setShowTD] = useState(true);
  const [showTurnover, setShowTurnover] = useState(false);
  const [showGameEvent, setShowGameEvent] = useState(false);
  const [reset, setReset] = useState(false);
  const handlePointsSelection = (value) => {
    switch (value) {
      case 'Turnover':
        setShowStates(false, true, false);
        break;
      case 'GameEvent':
        setShowStates(false, false, true);
        break;
      default:
        setShowStates(true, false, false);
        break;
    }
  };
  const setEvent = (update, isAgainstOpp) => {
    event = update;
    isAgainstOpponent = isAgainstOpp;
  };
  const setShowStates = (td, special, gameEvent) => {
    setShowTD(td);
    setShowTurnover(special);
    setShowGameEvent(gameEvent);
  };
  const handleSubmit = (formEvent) => {
    formEvent.preventDefault();
    setShowStates(true, false, false);
    setReset(true);
    updateParent(event, isAgainstOpponent);
  };
  return (
    <form className='form-control' onSubmit={(ev) => handleSubmit(ev)}>
      <div className="row mt-2">
        <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='td' text='Touchdown' checked={showTD} value='Touchdown'/>
        <RadioButton color='secondary' name='points' onChange={handlePointsSelection} id='turnover' text='Turnover' checked={showTurnover} value='Turnover'/>
        <RadioButton color='secondary' name='points' onChange={handlePointsSelection} id='gameEvent' text='Mehr...' checked={showGameEvent} value='GameEvent'/>
      </div>
      { showTD &&
      <Touchdown resetRequested={reset} setResetRequested={setReset} update={setEvent} />
      }
      { showTurnover &&
      <Turnover update={setEvent}/>
      }
      {
        showGameEvent &&
      <GameEvent update={setEvent}/>
      }
      <div className="row">
        <div className='mt-2 d-grid'>
          <button type='submit' className='btn btn-secondary'>
            Eintrag speichern
          </button>
        </div>
      </div>
    </form>
  );
};

AddPoints.propTypes = {
  onSubmit: PropTypes.func.isRequired,
};

export default AddPoints;
