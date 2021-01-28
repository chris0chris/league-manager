import React, { useEffect } from "react";
import Games from "./Games";
import Gamedays from "./Gamedays";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";
import { getGames } from "../../actions/games";

const SelectGame = (props) => {
  useEffect(() => {
    console.log("selectegame", props.gamedays);
    props.getGamedays();
  }, [props.gamedays.length]);
  return (
    <>
      {props.gamedays.length == 1 || props.games.length > 0 ? (
        ""
      ) : (
        <Gamedays gamedays={props.gamedays} onClick={props.getGames} />
      )}
      <Games games={props.games} />
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
