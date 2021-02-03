import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import RadioButton from "../layout/RadioButton";

const Details = (props) => {
  const selectedGame = props.selectedGame;
  return (
    <div className="container">
      <div className="row">
        <div className="col">
          <RadioButton
            id="home"
            name="teamName"
            onChange={() => {}}
            text={selectedGame.home}
          />
        </div>
        <div className="clo">a</div>
        <div className="clo">b</div>
        <div className="clo">
          <RadioButton
            id="away"
            name="teamName"
            onChange={() => {}}
            text={selectedGame.away}
          />
        </div>
      </div>
    </div>
  );
};

// Details.propTypes = {

// }

const mapStateToProps = (state) => ({
  selectedGame: state.gamesReducer.selectedGame,
});

export default connect(mapStateToProps)(Details);
