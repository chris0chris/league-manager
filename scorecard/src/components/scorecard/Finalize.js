/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {FaCheck, FaPaperPlane} from 'react-icons/fa';
import {Link, Redirect} from 'react-router-dom';
import {DETAILS_URL, ROOT_URL} from '../common/urls';
import {gameFinalize} from '../../actions/games';
import GameLog from './GameLog';

const Finalize = (props) => {
  const [isHomeConfirmed, setIsHomeConfirmed] = useState(false);
  const [isAwayConfirmed, setIsAwayConfirmed] = useState(false);
  const [isSuccessfulSubmitted, setIsSuccessfulSubmitted] = useState(false);
  const [showGameLog, setShowGameLog] = useState(false);
  const [homeCaptain, setHomeCaptain] = useState('');
  const [awayCaptain, setAwayCaptain] = useState('');
  const gameLog = props.gameLog;
  const handleEditLink = (ev) => {
    if (isHomeConfirmed || isAwayConfirmed) {
      console.log('handlelink');
      ev.preventDefault();
    }
  };
  const handleSubmit = (ev) => {
    ev.preventDefault();
    props.gameFinalize(gameLog.gameId, {
      homeCaptain: homeCaptain,
      awayCaptain: awayCaptain,
    });
    setIsSuccessfulSubmitted(true);
  };
  if (isSuccessfulSubmitted) {
    return <Redirect to={ROOT_URL} />;
  }
  return (<div className="container">
    <div className="row">
      <div className="col text-end">{gameLog.home.name}</div>
      <div className="col text-center fw-bold"><span className="card text-white bg-warning">{gameLog.home.score}</span></div>
      <div className="col text-center fw-bold" ><span className="card text-white bg-warning">{gameLog.away.score}</span></div>
      <div className="col">{gameLog.away.name}</div>
    </div>
    <div className="row">
      <div className="col-8 offset-2 mt-3">
        <Link to={DETAILS_URL} onClick={handleEditLink} className="d-grid" style={{textDecoration: 'none'}} data-testid="editScoreLink" >
          <button type='button' className='btn btn-secondary' disabled={isHomeConfirmed || isAwayConfirmed} >
            Spielstand bearbeiten
          </button>
        </Link>
      </div>
    </div>
    <form onSubmit={(ev) => handleSubmit(ev)}>
      <div className="input-group mt-5">
        <input type="text" className="form-control" placeholder={`${gameLog.home.name}-Captain Name`} aria-describedby="confirmHomeCaptain" required
          disabled={isHomeConfirmed} value={homeCaptain} onChange={(ev) => setHomeCaptain(ev.target.value)}/>
        <button type="button"
          onClick={() => {
            if (homeCaptain != '') {
              setIsHomeConfirmed(!isHomeConfirmed);
            }
          }}
          checked={isHomeConfirmed}
          className={isHomeConfirmed ? 'btn btn-success' : 'btn btn-outline-success'} id="confirmHomeCaptain" data-testid="confirmHomeButton">
          { !isHomeConfirmed &&
        <>Bestätigen <FaCheck className="ms-1"/></>}
          { isHomeConfirmed &&
        <>Zurück</>}
        </button>
      </div>
      <div className="input-group mt-3">
        <input type="text" className="form-control" placeholder={`${gameLog.away.name}-Captain Name`} aria-describedby="confirmAwayCaptain" required
          disabled={isAwayConfirmed} value={awayCaptain} onChange={(ev) => setAwayCaptain(ev.target.value)}/>
        <button type="button"
          onClick={() => {
            if (awayCaptain != '') {
              setIsAwayConfirmed(!isAwayConfirmed);
            }
          }}
          className={isAwayConfirmed ? 'btn btn-success' : 'btn btn-outline-success'} id="confirmAwayCaptain" data-testid="confirmAwayButton">
          { !isAwayConfirmed &&
        <>Bestätigen <FaCheck className="ms-1"/></>}
          { isAwayConfirmed &&
        <>Zurück</>}
        </button>
      </div>
      <div className="row mt-2">
        <div className="d-grid mt-3">
          <button type='submit' className='btn btn-primary'>
            Ergebnis abschicken <FaPaperPlane className="ms-5"/>
          </button>
        </div>
      </div>
    </form>
    <div className="form-check mt-3">
      <input className={`form-check-input ${false ? 'uncheck' : ''}`}
        onChange={() => setShowGameLog(!showGameLog)}
        type="checkbox"
        id="formCheck" />
      <label className="form-check-label" htmlFor="formCheck">Zeige Spielverlauf an</label>
    </div>
    {showGameLog &&
    <>
      <GameLog {...props} homeHalf={gameLog.home.secondhalf} awayHalf={gameLog.away.secondhalf}
        isFirstHalf={false} displayHome={true} displayBothTeams={true}/>
      <GameLog {...props} homeHalf={gameLog.home.firsthalf} awayHalf={gameLog.away.firsthalf}
        isFirstHalf={true} displayHome={true} displayBothTeams={true}/>
    </>}
  </div>
  );
};

Finalize.propTypes = {
  gameLog: PropTypes.object.isRequired,
  gameFinalize: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gameLog: state.gamesReducer.gameLog,
});


export default connect(mapStateToProps, {gameFinalize})(Finalize);
