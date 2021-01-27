import React, { useEffect } from "react";
import Games from "./Games";
import Gamedays from "./Gamedays";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";

const SelectGame = (props) => {
  useEffect(() => {
    console.log("selectegame", props.gamedays);
    props.getGamedays();
  }, [props.gamedays.length]);
  return (
    <>
      {props.gamedays.length == 1 ? "" : <Gamedays gamedays={props.gamedays} />}
      <Games />
    </>
  );
};

SelectGame.propTypes = {
  gamedays: PropTypes.array,
  getGamedays: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
});

export default connect(mapStateToProps, { getGamedays })(SelectGame);
