import React, { useEffect, useState } from "react";
import Games from "./Games";
import Gamedays from "./Gamedays";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";
import { getGames } from "../../actions/games";
import { Redirect } from "react-router-dom";
import { OFFICIALS_URL } from "../common/urls";

const initialState = {
  hideBtn: false,
};

const SelectGame = (props) => {
  const [isGameLoaded, setLoadGame] = useState(false);
  useEffect(() => {
    props.getGamedays();
  }, [props.gamedays.length]);

  const loadGamesForGameday = (id) => {
    props.getGames(id);
  };

  const loadGame = () => {
    setLoadGame(!isGameLoaded);
  };
  if (isGameLoaded) {
    return <Redirect to={OFFICIALS_URL} />;
  }
  return (
    <>
      <Gamedays gamedays={props.gamedays} onClick={loadGamesForGameday} />
      <Games games={props.games} onClick={loadGame} />
    </>
  );
};

SelectGame.propTypes = {
  gamedays: PropTypes.array,
  getGamedays: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
  games: state.gamesReducer.games,
});

export default connect(mapStateToProps, { getGamedays, getGames })(SelectGame);
