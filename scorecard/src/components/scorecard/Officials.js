/* eslint-disable max-len */
import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import FloatingInput from '../layout/FloatingInput';
import {FaArrowLeft, FaArrowRight} from 'react-icons/fa';
import {Redirect} from 'react-router-dom';
import {DETAILS_URL} from '../common/urls';
import {GameSetup, Official} from '../../actions/objects';
import {
  getGameSetup,
  saveGameSetup,
  getOfficials,
  saveOfficials} from '../../actions/gamesetup';
import {getGameLog, updateTeamInPossession} from '../../actions/games';
import RadioButton from '../layout/RadioButton';

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  const [isSuccessfulSubmitted, setIsSuccessfulSubmitted] = useState(false);
  const [scJudge, setScJudge] = useState('');
  const [referee, setReferee] = useState('');
  const [downJudge, setDownJudge] = useState('');
  const [fieldJudge, setFieldJudge] = useState('');
  const [sideJudge, setSideJudge] = useState('');
  const [ct, setCt] = useState();
  const [fhPossession, setFhPossession] = useState('');
  const [direction, setDirection] = useState('');

  useEffect(() => {
    props.getOfficials(selectedGame.id);
    props.getGameSetup(selectedGame.id);
  }, []);
  useEffect(() => {
    if (props.gameSetupOfficials.length == 0) {
      setReferee('');
      setScJudge('');
      setDownJudge('');
      setFieldJudge('');
      setSideJudge('');
    } else {
      props.gameSetupOfficials.forEach((item) => {
        switch (item.position) {
          case Official.REFEREE:
            setReferee(item.name);
            break;
          case Official.SCORECARD_JUDGE:
            setScJudge(item.name);
            break;
          case Official.DOWN_JUDGE:
            setDownJudge(item.name);
            break;
          case Official.FIELD_JUDGE:
            setFieldJudge(item.name);
            break;
          case Official.SIDE_JUDGE:
            setSideJudge(item.name);
            break;
          default:
            break;
        }
      });
    }
  }, [JSON.stringify(props.gameSetupOfficials)]);
  useEffect(() => {
    setCt(props.gameSetup.ctResult);
    setDirection(props.gameSetup.direction);
    setFhPossession(props.gameSetup.fhPossession);
  }, [JSON.stringify(props.gameSetup)]);
  const handleSubmit = (event) => {
    event.preventDefault();
    const gameSetup = new GameSetup(
        selectedGame.id,
        ct,
        fhPossession,
        direction,
    );
    const officials = [];
    officials.push({name: referee, position: Official.REFEREE});
    officials.push({name: scJudge, position: Official.SCORECARD_JUDGE});
    officials.push({name: downJudge, position: Official.DOWN_JUDGE});
    officials.push({name: fieldJudge, position: Official.FIELD_JUDGE});
    officials.push({name: sideJudge, position: Official.SIDE_JUDGE});
    props.saveGameSetup(selectedGame.id, gameSetup);
    props.saveOfficials(selectedGame.id, officials);
    props.updateTeamInPossession(selectedGame.id, fhPossession);
    props.getGameLog(selectedGame.id);
    setIsSuccessfulSubmitted(true);
  };
  if (isSuccessfulSubmitted) {
    return <Redirect to={`${DETAILS_URL}?start=${fhPossession}`} />;
  }
  return (
    <div className="container">
      <h4 className="mt-2">
        Feld {selectedGame.field}: {selectedGame.home} vs {selectedGame.away}
      </h4>
      <form onSubmit={handleSubmit}>
        <FloatingInput
          id="scJudgeName"
          text="Scorecard Judge-Name"
          value={scJudge}
          onChange={setScJudge}
        />
        <FloatingInput
          id="referee"
          text="Referee-Name"
          value={referee}
          onChange={setReferee}
        />
        <FloatingInput
          id="downJudge"
          text="Down Judge-Name"
          value={downJudge}
          onChange={setDownJudge}
        />
        <FloatingInput
          id="fieldJudge"
          text="Field Judge-Name"
          value={fieldJudge}
          onChange={setFieldJudge}
        />
        <FloatingInput
          id="sideJudge"
          text="Side Judge-Name"
          value={sideJudge}
          onChange={setSideJudge}
        />
        <div className="row mt-3">
          <div>
            Münzwahl hat:{' '}
            <span className="fw-bold" data-testid="ctTeam">
              {selectedGame.away}
            </span>
          </div>
        </div>
        <div className="row mt-3">
          <RadioButton
            id="ctWon"
            name="coinToss"
            color="secondary"
            onChange={setCt}
            text="Gewonnen"
            checked={ct == 'Gewonnen'}
          />
          <RadioButton
            id="ctLost"
            name="coinToss"
            color="secondary"
            onChange={setCt}
            text="Verloren"
            checked={ct == 'Verloren'}
          />
        </div>
        <div className="row mt-3">
          <div>Team mit Ballbesitz in der 1. Halbzeit</div>
        </div>
        <div className="row mt-3">
          <RadioButton
            id="possessionHome"
            name="fhPossesion"
            color="secondary"
            onChange={setFhPossession}
            text={selectedGame.home}
            checked={fhPossession == selectedGame.home}
          />
          <RadioButton
            id="possessionAway"
            name="fhPossesion"
            color="secondary"
            onChange={setFhPossession}
            text={selectedGame.away}
            checked={fhPossession == selectedGame.away}
          />
        </div>

        <div className="row mt-3">
          <div>Spielrichtung 1. Halbzeit (aus Blick Scorecard Judge)</div>
        </div>
        <div className="row mt-3">
          <RadioButton
            id="directionLeft"
            name="direction"
            color="secondary"
            onChange={setDirection}
            text={<FaArrowLeft title="directionLeft" />}
            value="directionLeft"
            checked={direction == 'directionLeft'}
          />
          <RadioButton
            id="directionRight"
            name="direction"
            color="secondary"
            onChange={setDirection}
            text={<FaArrowRight title="directionRight" />}
            value="directionRight"
            checked={direction == 'directionRight'}
          />
        </div>

        <div className="d-grid mt-3">
          <button className="btn btn-primary" type="submit">
            Spiel starten
          </button>
        </div>
      </form>
    </div>
  );
};

Officials.propTypes = {
  selectedGame: PropTypes.object.isRequired,
  gameSetupOfficials: PropTypes.array.isRequired,
  gameSetup: PropTypes.object.isRequired,
  getGameSetup: PropTypes.func.isRequired,
  saveGameSetup: PropTypes.func.isRequired,
  getOfficials: PropTypes.func.isRequired,
  saveOfficials: PropTypes.func.isRequired,
  getGameLog: PropTypes.func.isRequired,
  updateTeamInPossession: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  games: state.gamesReducer.games,
  selectedGame: state.gamesReducer.selectedGame,
  gameSetupOfficials: state.gamesReducer.gameSetupOfficials,
  gameSetup: state.gamesReducer.gameSetup,
});

export default connect(mapStateToProps,
    {getGameSetup,
      saveGameSetup,
      getOfficials,
      saveOfficials,
      getGameLog,
      updateTeamInPossession})(Officials);
