/* eslint-disable max-len */
import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import RadioButton from '../layout/RadioButton';
import {FaStopwatch} from 'react-icons/fa';
import GameLog from './GameLog';
import AddPoints from './AddPoints';
import {useLocation} from 'react-router-dom';

const Details = (props) => {
  const gameLog = props.gameLog;
  const [displayBothTeamLogs, setDisplaybothTeamLogs] = useState(false);
  const [showHomeLog, setShowHomeLog] = useState(true);
  const [teamInPossession, setTeamInPossession] = useState(gameLog.home.name);
  const queryParams = useLocation().search;
  useEffect(() => {
    if (queryParams) {
      const startingTeam = queryParams.split('=')[1];
      setTeamInPossession(startingTeam);
    }
  }, []);
  const handleSwitch = () => {
    setDisplaybothTeamLogs(!displayBothTeamLogs);
  };
  const updateTeam = (teamName) => {
    setTeamInPossession(teamName);
    setShowHomeLog(true);
  };
  return (
    <div className='container'>
      <div className='row'>
        <div className='col-6'>
          <RadioButton
            id='home'
            name='teamName'
            onChange={(teamName) => {
              updateTeam(teamName);
              setShowHomeLog(true);
            }}
            value={gameLog.home.name}
            checked={teamInPossession == gameLog.home.name}
            text={
              <>
                {gameLog.home.name}{' '}
                <span
                  className='badge bg-warning'
                  style={{
                    marginLeft: '15px',
                    width: '45px',
                    fontSize: '15px',
                  }}
                >
                  {gameLog.home.score}
                </span>
              </>
            }
          />
        </div>
        <div className='col-6'>
          <RadioButton
            id='away'
            name='teamName'
            onChange={(teamName) => {
              updateTeam(teamName);
              setShowHomeLog(false);
            }}
            value={gameLog.away.name}
            checked={teamInPossession == gameLog.away.name}
            text={
              <>
                <span
                  className='badge bg-warning'
                  style={{
                    marginRight: '15px',
                    width: '45px',
                    fontSize: '15px',
                  }}
                >
                  {gameLog.away.score}
                </span>{' '}
                {gameLog.away.name}
              </>
            }
          />
        </div>
      </div>
      <AddPoints />
      <div className='row'>
        <div className='col-2 mt-2'>
          <button type='button' className='btn btn-secondary'>
            <FaStopwatch />
          </button>
        </div>
        <div className='col-2 mt-2'>
          <button type='button' className='btn btn-secondary'>
            <FaStopwatch />
          </button>
        </div>
        <div className='col-4 mt-2 d-grid'>
          <button type='button' className='btn btn-secondary'>
            Halbzeit
          </button>
        </div>
        <div className='col-2 mt-2'>
          <button type='button' className='btn btn-secondary'>
            <FaStopwatch />
          </button>
        </div>
        <div className='col-2 mt-2'>
          <button type='button' className='btn btn-secondary'>
            <FaStopwatch />
          </button>
        </div>
      </div>
      <GameLog homeHalf={gameLog.home.secondhalf} awayHalf={gameLog.away.secondhalf}
        isFirstHalf={false} displayHome={showHomeLog} displayBothTeams={displayBothTeamLogs}/>
      <GameLog homeHalf={gameLog.home.firsthalf} awayHalf={gameLog.away.firsthalf}
        isFirstHalf={true} displayHome={showHomeLog} displayBothTeams={displayBothTeamLogs}/>
      <div className="form-check">
        <input className={`form-check-input ${displayBothTeamLogs ? 'uncheck' : ''}`}
          onChange={() => handleSwitch()}
          type="checkbox"
          id="formCheck"
          value=""
          checked />
        <label className="form-check-label" htmlFor="formCheck">Zeige Einträge ein Team</label>
      </div>
    </div>
  );
};

Details.propTypes = {
  gameLog: PropTypes.object,
  props: PropTypes.object,
};

const mapStateToProps = (state) => ({
  gameLog: state.gamesReducer.gameLog,
});

export default connect(mapStateToProps)(Details);
