import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {FaCheck, FaStopwatch, FaTimes} from 'react-icons/fa';
import Timer from '../layout/Timer';
import $ from 'jquery/src/jquery';

const Timeout = ({teamName = 'TeamName', modId}) => {
  const [timerIsOn, setTimerIsOn] = useState(false);
  const [gameTimeMinutes, setGameTimeMinutes] = useState('');
  const [gameTimeSeconds, setGameTimeSeconds] = useState('');
  const stopTimer = () => {
    setGameTimeSeconds('');
    setGameTimeMinutes('');
    setTimerIsOn(false);
  };
  const handleSubmit = (ev) => {
    ev.preventDefault();
    $(`#modalId_${modId}`).modal('hide');
    setTimerIsOn(false);
  };
  return (
    <div>
      {!gameTimeMinutes &&
        <button type="button"
          onClick={()=>setTimerIsOn(true)}
          className="btn btn-secondary justify-content-center"
          data-bs-toggle="modal"
          data-bs-target={`#modalId_${modId}`}
          data-testid='timeoutButton'>
          <FaStopwatch />
        </button>
      }
      {gameTimeMinutes &&
      <button type="button" className="btn btn-secondary timeout"
        disabled data-testid='timeoutButton'>
        {`${gameTimeMinutes}:${gameTimeSeconds}`}
      </button>
      }
      <div className="modal fade"
        id={`modalId_${modId}`}
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabIndex="-1">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Auszeit {teamName}</h5>
            </div>
            <div className="modal-body">
              <div className="row"><div>restliche Spielzeit:</div></div>
              <div className="row mt-2">
                <div className="col">
                  <input type="number"
                    max="19"
                    className="form-control text-end"
                    placeholder="Minuten"
                    value={gameTimeMinutes}
                    onChange={(ev) => setGameTimeMinutes(ev.target.value)}
                    required />
                </div>
                <div className="col">
                  <input type="number"
                    className="form-control"
                    placeholder="Sekunden"
                    value={gameTimeSeconds}
                    onChange={(ev) => setGameTimeSeconds(ev.target.value)}
                    required />
                </div>
              </div>
              <hr />
              <Timer isOn={timerIsOn} durationInSeconds={60} />
            </div>
            <div className="modal-footer row">
              <div className="col d-grid">
                <button type="button"
                  onClick={stopTimer}
                  className="btn btn-dark"
                  data-bs-dismiss="modal">
                  Abbrechen
                  <FaTimes className="ms-3" />
                </button>
              </div>
              <div className="col d-grid">
                <button type="submit"
                  className="btn btn-success">
                  Fertig
                  <FaCheck className="ms-3" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

Timeout.propTypes = {
  teamName: PropTypes.string.isRequired,
  modId: PropTypes.string.isRequired,
};

export default Timeout;
