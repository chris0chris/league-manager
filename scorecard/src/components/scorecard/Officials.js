import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import FloatingInput from "../layout/FloatingInput";
import RadioButtons from "../layout/RadioButtons";

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  return (
    <div className="container">
      <h4 className="mt-2">
        Feld {selectedGame.field}: {selectedGame.home} vs {selectedGame.away}
      </h4>
      <form className="">
        <FloatingInput id="scJudgeName" text="Scorecard Judge-Name" />
        <FloatingInput id="referee" text="Referee-Name" />
        <FloatingInput id="downJudge" text="Down Judge-Name" />
        <FloatingInput id="fieldJudge" text="Field Judge-Name" />
        <FloatingInput id="sideJudge" text="Side Judge-Name" />
        <RadioButtons
          name="fhPossesion"
          buttonInfos={[
            { id: "possessionHome", text: "Home" },
            { id: "possessionAway", text: "Away" },
          ]}
        />
        <div className="d-grid mt-3">
          <button className="btn btn-primary" type="submit">
            Spiel starten
          </button>
        </div>
      </form>
    </div>
  );
};

// Officials.propTypes = {
//   props: PropTypes,
// };

const mapStateToProps = (state) => ({
  games: state.gamesReducer.games,
  selectedGame: state.gamesReducer.selectedGame,
});

export default connect(mapStateToProps)(Officials);
