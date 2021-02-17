/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';
import Touchdown from './Touchdown';
import SpecialPoints from './SpecialPoints';
import GameEvent from './GameEvent';

const AddPoints = ({onSubmit: updateParent}) => {
  let event = null;
  const [showTD, setShowTD] = useState(true);
  const [showSpecial, setShowSpecial] = useState(false);
  const [showTurnover, setShowTurnover] = useState(false);
  const [reset, setReset] = useState(false);
  const handlePointsSelection = (value) => {
    switch (value) {
      case 'spezial':
        setShowStates(false, true, false);
        break;
      case 'turnover':
        setShowStates(false, false, true);
        break;
      default:
        setShowStates(true, false, false);
        break;
    }
  };
  const setEvent = (update) => {
    event = update;
  };
  const setShowStates = (td, special, turnover) => {
    setShowTD(td);
    setShowSpecial(special);
    setShowTurnover(turnover);
  };
  const handleSubmit = (formEvent) => {
    formEvent.preventDefault();
    setShowStates(true, false, false);
    setReset(true);
    updateParent(event);
  };
  return (<form className='form-control' onSubmit={(ev) => handleSubmit(ev)}>
    <div className="row mt-2">
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='td' text='Touchdown' checked={showTD} value='td'/>
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='otherPoints' text='Spezial' checked={showSpecial} value='spezial'/>
      <RadioButton color='secondary' name='points' onChange={handlePointsSelection} id='cop' text='Defense' checked={showTurnover} value='turnover'/>
    </div>
    { showTD &&
      <Touchdown resetRequested={reset} setResetRequested={setReset} update={setEvent} />
    }
    { showSpecial &&
      <SpecialPoints resetRequested={reset} setResetRequested={setReset} update={setEvent} />
    }
    {
      showTurnover &&
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
