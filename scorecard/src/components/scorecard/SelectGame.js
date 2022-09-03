import React, {useEffect, useState} from 'react';
import Games from './Games';
import Gamedays from './Gamedays';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {getGamedays} from '../../actions/gamedays';
import {getGames, setSelectedGame} from '../../actions/games';
import {getTeamOfficials} from '../../actions/officials';
import {Navigate} from 'react-router-dom';
import {OFFICIALS_URL} from '../common/urls';
import {
  getGameSetup,
  getOfficials} from '../../actions/gamesetup';

const SelectGame = (props) => {
  const [isSelectedGameLoaded, setSelectedGameLoaded] = useState(false);
  const [gamesForGamedayLoaded, setGamesForGamedayLoaded] = useState(false);
  const [selectedGamedayId, setSelectedGamedayId] = useState(null);
  useEffect(() => {
    props.getGamedays();
  }, [props.gamedays.length]);

  const loadGamesForGameday = (id) => {
    props.getGames(id, props.user.username);
    setSelectedGamedayId(id);
    setGamesForGamedayLoaded(true);
  };
  const loadAllGames = (loadAll) => {
    if (loadAll) {
      props.getGames(selectedGamedayId, '*');
    } else {
      props.getGames(selectedGamedayId, props.user.username);
    }
  };

  const loadGame = (index) => {
    console.log('loadgame', props.games[index]);
    props.setSelectedGame(props.games[index]);
    props.getOfficials(props.games[index].id);
    props.getGameSetup(props.games[index].id);
    props.getTeamOfficials(props.games[index].officialsId);
    setSelectedGameLoaded(true);
  };
  if (isSelectedGameLoaded) {
    return <Navigate to={OFFICIALS_URL} />;
  }
  return (
    <div>
      <Gamedays gamedays={props.gamedays} onClick={loadGamesForGameday} />
      {gamesForGamedayLoaded &&
      <Games games={props.games}
        onClick={loadGame} loadAllGames={loadAllGames} />}
    </div>
  );
};

SelectGame.propTypes = {
  gamedays: PropTypes.array.isRequired,
  games: PropTypes.array.isRequired,
  user: PropTypes.object.isRequired,
  getGamedays: PropTypes.func.isRequired,
  getGames: PropTypes.func.isRequired,
  getTeamOfficials: PropTypes.func.isRequired,
  getOfficials: PropTypes.func.isRequired,
  getGameSetup: PropTypes.func.isRequired,
  setSelectedGame: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
  games: state.gamesReducer.games,
  user: state.authReducer.user,
});

export default connect(mapStateToProps, {
  getGamedays,
  getGames,
  setSelectedGame,
  getTeamOfficials,
  getOfficials,
  getGameSetup,
})(SelectGame);
