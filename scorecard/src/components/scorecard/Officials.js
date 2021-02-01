import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import FloatingInput from "../layout/FloatingInput";
import RadioButtons from "../layout/RadioButtons";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { Redirect } from "react-router-dom";
import { DETAILS_URL } from "../common/urls";

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  const [isSuccessfulSubmitted, setIsSuccessfulSubmitted] = useState(false);
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("submitting");
    setIsSuccessfulSubmitted(true);
  };

  if (isSuccessfulSubmitted) {
    return <Redirect to={DETAILS_URL} />;
  }
  return (
    <div className="container">
      <h4 className="mt-2">
        Feld {selectedGame.field}: {selectedGame.home} vs {selectedGame.away}
      </h4>
      <form onSubmit={handleSubmit}>
        <FloatingInput id="scJudgeName" text="Scorecard Judge-Name" />
        <FloatingInput id="referee" text="Referee-Name" />
        <FloatingInput id="downJudge" text="Down Judge-Name" />
        <FloatingInput id="fieldJudge" text="Field Judge-Name" />
        <FloatingInput id="sideJudge" text="Side Judge-Name" />
        <div className="row mt-3">
          <div>
            Münzwahl hat:{" "}
            <span className="fw-bold" data-testid="ctTeam">
              {selectedGame.away}
            </span>
          </div>
        </div>
        <RadioButtons
          name="coinToss"
          buttonInfos={[
            { id: "ctWon", text: "Gewonnen" },
            { id: "ctLost", text: "Verloren" },
          ]}
        />
        <div className="row mt-3">
          <div>Team mit Ballbesitz in der ersten Halbzeit</div>
        </div>
        <RadioButtons
          name="fhPossesion"
          buttonInfos={[
            { id: "possessionHome", text: selectedGame.home },
            { id: "possessionAway", text: selectedGame.away },
          ]}
        />
        <div className="row mt-3">
          <div>Spielrichtung erste Halbzeit (aus Blick Scorecard Judge)</div>
        </div>
        <RadioButtons
          name="direction"
          buttonInfos={[
            {
              id: "directionForward",
              text: <FaArrowLeft title="directionBackward" />,
            },
            {
              id: "directionBackward",
              text: <FaArrowRight title="directionForward" />,
            },
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
