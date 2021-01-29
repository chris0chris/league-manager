import React, { useEffect, useState } from "react";
import Games from "./Games";
import Gamedays from "./Gamedays";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";
import { getGames } from "../../actions/games";

const initialState = {
  hideBtn: false,
};

const SelectGame = (props) => {
  const [hideBtn, setHideBtn] = useState(false);
  useEffect(() => {
    console.log("before getGamedays", props.gamedays);
    props.getGamedays();
    console.log("after getGamedays", props.gamedays);
  }, [props.gamedays.length]);

  const meth = (id) => {
    console.log("onClick called", id);
    setHideBtn(!hideBtn);
    props.getGames(id);
  };
  return (
    <>
      {!hideBtn && (
        // <Gamedays gamedays={props.gamedays} onClick={props.getGames} />
        <Gamedays gamedays={props.gamedays} onClick={meth} />
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
