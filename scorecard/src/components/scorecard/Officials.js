/* eslint-disable max-len */
import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {FaArrowLeft, FaArrowRight} from 'react-icons/fa';
import {Navigate} from 'react-router-dom';
import {DETAILS_URL} from '../common/urls';
import {GameSetup, Official} from '../../actions/objects';
import {
  getGameSetup,
  saveGameSetup,
  getOfficials,
  saveOfficials} from '../../actions/gamesetup';
import {getGameLog, updateTeamInPossession} from '../../actions/games';
import RadioButton from '../layout/RadioButton';
import InputDropdown from '../layout/InputDropdown';

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  const [isSuccessfulSubmitted, setIsSuccessfulSubmitted] = useState(false);
  const [scJudgeInit, setScJudgeInit] = useState({text: '', id: null});
  const [refereeInit, setRefereeInit] = useState({text: '', id: null});
  const [downJudgeInit, setDownJudgeInit] = useState({text: '', id: null});
  const [fieldJudgeInit, setFieldJudgeInit] = useState({text: '', id: null});
  const [sideJudgeInit, setSideJudgeInit] = useState({text: '', id: null});
  const [ct, setCt] = useState();
  const [fhPossession, setFhPossession] = useState('');
  const [direction, setDirection] = useState('');
  const [teamOfficials, setTeamOfficials] = useState([]);
  const [referee, setReferee] = useState({text: '', id: null});
  const [scJudge, setScJudge] = useState({text: '', id: null});
  const [downJudge, setDownJudge] = useState({text: '', id: null});
  const [fieldJudge, setFieldJudge] = useState({text: '', id: null});
  const [sideJudge, setSideJudge] = useState({text: '', id: null});

  useEffect(() => {
    setTeamOfficials((props.teamOfficials).map((entry) => {
      return {
        text: `${entry.first_name} ${entry.last_name}`,
        subtext: entry.team,
        id: entry.id,
      };
    }));
  }, [props.teamOfficials, props.gameSetup, props.gameSetupOfficials]);

  useEffect(() => {
    if (props.gameSetupOfficials.length > 0) {
      props.gameSetupOfficials.forEach((item) => {
        switch (item.position) {
          case Official.REFEREE:
            setRefereeInit({text: item.name, id: item.official});
            break;
          case Official.SCORECARD_JUDGE:
            setScJudgeInit({text: item.name, id: item.official});
            break;
          case Official.DOWN_JUDGE:
            setDownJudgeInit({text: item.name, id: item.official});
            break;
          case Official.FIELD_JUDGE:
            setFieldJudgeInit({text: item.name, id: item.official});
            break;
          case Official.SIDE_JUDGE:
            setSideJudgeInit({text: item.name, id: item.official});
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
    officials.push({name: referee.text, position: Official.REFEREE, official: referee.id});
    officials.push({name: scJudge.text, position: Official.SCORECARD_JUDGE, official: scJudge.id});
    officials.push({name: downJudge.text, position: Official.DOWN_JUDGE, official: downJudge.id});
    officials.push({name: fieldJudge.text, position: Official.FIELD_JUDGE, official: fieldJudge.id});
    officials.push({name: sideJudge.text, position: Official.SIDE_JUDGE, official: sideJudge.id});
    props.saveGameSetup(selectedGame.id, gameSetup);
    props.saveOfficials(selectedGame.id, officials);
    props.updateTeamInPossession(selectedGame.id, fhPossession);
    props.getGameLog(selectedGame.id);
    setIsSuccessfulSubmitted(true);
  };
  if (isSuccessfulSubmitted) {
    return <Navigate to={`${DETAILS_URL}?start=${fhPossession}`} />;
  }
  return (
    <div className="container">
      <div className='text-muted fs6'>
      Feld {selectedGame.field} - {selectedGame.scheduled.slice(0, -3)} Uhr - {selectedGame.standing}
      </div>
      <h4 className="mt-2">
        {selectedGame.home} vs {selectedGame.away}
      </h4>
      <form onSubmit={handleSubmit}>
        <InputDropdown
          id='scJudgeName'
          setSelectedIndex={setScJudge}
          placeholderText="Scorecard Judge (Vorname Nachname)"
          focus={false}
          initValues={scJudgeInit}
          items={teamOfficials}/>
        <InputDropdown
          id='referee'
          setSelectedIndex={setReferee}
          placeholderText="Referee (Vorname Nachname)"
          initValues={refereeInit}
          items={teamOfficials}/>
        <InputDropdown
          id='downJudge'
          setSelectedIndex={setDownJudge}
          placeholderText="Down Judge (Vorname Nachname)"
          initValues={downJudgeInit}
          items={teamOfficials}/>
        <InputDropdown
          id='fieldJudge'
          setSelectedIndex={setFieldJudge}
          placeholderText="Field Judge (Vorname Nachname)"
          initValues={fieldJudgeInit}
          items={teamOfficials}/>
        <InputDropdown
          id='sideJudge'
          setSelectedIndex={setSideJudge}
          placeholderText="Side Judge (Vorname Nachname)"
          initValues={sideJudgeInit}
          items={teamOfficials}/>
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
  teamOfficials: PropTypes.array,
  getGameLog: PropTypes.func.isRequired,
  updateTeamInPossession: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  games: state.gamesReducer.games,
  selectedGame: state.gamesReducer.selectedGame,
  gameSetupOfficials: state.gamesReducer.gameSetupOfficials,
  gameSetup: state.gamesReducer.gameSetup,
  teamOfficials: state.officialsReducer.teamOfficials,
});

export default connect(mapStateToProps,
    {getGameSetup,
      saveGameSetup,
      getOfficials,
      saveOfficials,
      getGameLog,
      updateTeamInPossession})(Officials);
