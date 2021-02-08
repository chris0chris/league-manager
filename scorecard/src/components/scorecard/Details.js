import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import RadioButton from '../layout/RadioButton';
import {FaStopwatch} from 'react-icons/fa';
import ScorecardTable from './ScorecardTable';

const Details = (props) => {
  const gameLog = props.gameLog;
  return (
    <div className='container'>
      <div className='row'>
        <div className='col-6'>
          <RadioButton
            id='home'
            name='teamName'
            onChange={() => {}}
            value={gameLog.home.name}
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
            onChange={() => {}}
            value={gameLog.away.name}
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
      <div className='row'>
        <div className='col'>
          <ScorecardTable
            entries={gameLog.home.firsthalf.entries.concat(gameLog.away.secondhalf.entries)}
          />
        </div>
        <div className='col'>
          {/* <ScorecardTable
            entries={[
              {
                id: 1,
                number: 1,
                sixPoints: "#19",
                twoPoints: "",
                onePoint: "#7",
              },
              {
                id: 2,
                number: 2,
                sixPoints: "",
                twoPoints: "#4",
                onePoint: "",
              },
              {
                id: 3,
                number: 3,
                sixPoints: "#7",
                twoPoints: "",
                onePoint: "#19",
              },
            ]}
          /> */}
        </div>
      </div>
    </div>
  );
};

Details.propTypes = {
  gameLog: PropTypes.object,
};

const mapStateToProps = (state) => ({
  gameLog: state.gamesReducer.gameLog,
});

export default connect(mapStateToProps)(Details);
