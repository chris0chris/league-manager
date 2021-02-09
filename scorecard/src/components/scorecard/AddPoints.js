/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import RadioButton from '../layout/RadioButton';

const AddPoints = (props) => {
  const [event, setEvent] = useState('td');
  const [showTD, setShowTD] = useState(true);
  const [showSpecial, setShowSpecial] = useState(false);
  const [showTurnover, setShowTurnover] = useState(false);
  const handlePointsSelection = (value) => {
    setEvent(value);
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
  const setShowStates = (td, special, turnover) => {
    setShowTD(td);
    setShowSpecial(special);
    setShowTurnover(turnover);
  };
  const handleSubmit = (...params) => {
    console.log(params);
  };
  return (<form className='form-control' onSubmit={handleSubmit}>
    <div className="row mt-2">
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='td' text='Touchdown' checked={true} value='td'/>
      <RadioButton color='warning' name='points' onChange={handlePointsSelection} id='otherPoints' text='Spezial' value='spezial'/>
      <RadioButton name='points' onChange={handlePointsSelection} id='cop' text='Defense' value='turnover'/>
    </div>
    { showTD &&
    <><div className="input-group mt-2">
      <div className="input-group-text" id="btnGroupAddon">#TD&nbsp;</div>
      <input type="number" className="form-control" placeholder="Trikotnummer" aria-label="Input group example" aria-describedby="btnGroupAddon" />
    </div>
    <div className="row mt-1" role="toolbar" aria-label="PATbar">
      <div className="col-9">
        <div className="input-group">
          <div className="input-group-text" id="btnGroupAddon">#PAT</div>
          <input type="number" className="form-control" placeholder="Trikotnummer" aria-label="Input group example" aria-describedby="btnGroupAddon" />
        </div>
      </div>
      <div className="col-3 d-grid">
        <div className="btn-group" role="group" aria-label="PAT group">
          <input type="radio" id='pat1' name="pat" className="btn-check" defaultValue='1' defaultChecked />
          <label className="btn btn-outline-warning" htmlFor='pat1'>
        1
          </label>
          <input type="radio" id='pat2' name="pat" className="btn-check" defaultValue='2'/>
          <label className="btn btn-outline-warning" htmlFor='pat2'>
        2
          </label>
        </div>
      </div>
    </div></>}
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
