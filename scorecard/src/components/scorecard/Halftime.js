/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import Timeout from './Timeout';
import {FaCheck, FaTimes} from 'react-icons/fa';
import Timer from '../layout/Timer';
import $ from 'jquery/src/jquery';

const Halftime = ({gameLog, isFirstHalf, onSubmit: handleCallback}) => {
  const [timerIsOn, setTimerIsOn] = useState(false);
  const handleSubmit = (ev) => {
    ev.preventDefault();
    setTimerIsOn(false);
    $('#halftimeTimer').modal('hide');
    handleCallback(true);
  };
  return (<>
    <div className='row mt-2'>
      <div className='col-2'>
        <Timeout teamName={gameLog.home.name} isSecondHalf={!isFirstHalf} modId="1" />
      </div>
      <div className='col-2'>
        <Timeout teamName={gameLog.home.name} isSecondHalf={!isFirstHalf} modId="2" />
      </div>
      <div className='col-4 d-grid'>
        { isFirstHalf &&
        <button type="button"
          onClick={()=>setTimerIsOn(true)}
          className="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#halftimeTimer"
          data-testid='halftimeButton'>
          Halbzeit
        </button>}
        { !isFirstHalf &&
        <button type='button' className='btn btn-primary' onClick={() => handleCallback(false)} data-testid='finalizeButton'>
            Ende
        </button>}
      </div>
      <div className='col-2'>
        <Timeout teamName={gameLog.away.name} isSecondHalf={!isFirstHalf} modId="3" />
      </div>
      <div className='col-2'>
        <Timeout teamName={gameLog.away.name} isSecondHalf={!isFirstHalf} modId="4" />
      </div>
    </div>
    <div className="modal fade" id='halftimeTimer'
      data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1">
      <div className="modal-dialog">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">Halbzeit {gameLog.home.name} {gameLog.home.score}:{gameLog.away.score} {gameLog.away.name}</h5>
          </div>
          <div className="modal-body">
            <Timer isOn={timerIsOn} durationInSeconds={60} />
          </div>
          <div className="modal-footer row">
            <div className="col d-grid">
              <button type="button"
                onClick={() => setTimerIsOn(false)}
                className="btn btn-dark"
                data-bs-dismiss="modal"
                data-testid="halftime-cancel">
                  Abbrechen
                <FaTimes className="ms-3" />
              </button>
            </div>
            <div className="col d-grid">
              <button type="submit"
                className="btn btn-success"
                data-testid="halftime-done">
                  Fertig
                <FaCheck className="ms-3" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div></>
  );
};

Halftime.propTypes = {
  gameLog: PropTypes.object.isRequired,
  isFirstHalf: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Halftime;
