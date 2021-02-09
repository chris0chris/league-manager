/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';
import Touchdown from './Touchdown';

const AddPoints = (props) => {
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
    console.log(event);
    setReset(true);
  };
  return (<form className='form-control' onSubmit={handleSubmit}>
    <div className="row mt-2">
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='td' text='Touchdown' checked={true} value='td'/>
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='otherPoints' text='Spezial' value='spezial'/>
      <RadioButton name='points' onChange={handlePointsSelection} id='cop' text='Defense' value='turnover'/>
    </div>
    { showTD &&
      <Touchdown resetRequested={reset} setResetRequested={setReset} update={setEvent} />
    }
    { showSpecial &&
      <div className="row">
        Spezial
      </div>
    }
    {
      showTurnover &&
      <div className="row">
        Turnover
      </div>
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
  props: PropTypes.object,
};

export default AddPoints;
