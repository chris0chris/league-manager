import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import FloatingInput from "../layout/FloatingInput";
import RadioButtons from "../layout/RadioButtons";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { Redirect } from "react-router-dom";
import { DETAILS_URL } from "../common/urls";
import { GameSetup, Official } from "../../actions/objects";
import { saveGameSetup, saveOfficials } from "../../actions/gamesetup";

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  const [isSuccessfulSubmitted, setIsSuccessfulSubmitted] = useState(false);
  const [scJudge, setScJudge] = useState(
    new Official(selectedGame.id, "", Official.SCORECARD_JUDGE)
  );
  const [referee, setReferee] = useState(
    new Official(selectedGame.id, "", Official.REFEREE)
  );
  const [downJudge, setDownJudge] = useState(
    new Official(selectedGame.id, "", Official.DOWN_JUDGE)
  );
  const [fieldJudge, setFieldJudge] = useState(
    new Official(selectedGame.id, "", Official.FIELD_JUDGE)
  );
  const [sideJudge, setSideJudge] = useState(
    new Official(selectedGame.id, "", Official.SIDE_JUDGE)
  );
  const [ct, setCt] = useState();
  const [fhPossession, setFhPossession] = useState("");
  const [direction, setDirection] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    const gameSetup = new GameSetup(
      selectedGame.id,
      ct,
      fhPossession,
      direction
    );
    const officials = [];
    officials.push(referee);
    officials.push(scJudge);
    officials.push(downJudge);
    officials.push(fieldJudge);
    officials.push(sideJudge);
    props.saveGameSetup(gameSetup);
    props.saveOfficials(officials);
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
            Münzwahl hat:{" "}
            <span className="fw-bold" data-testid="ctTeam">
              {selectedGame.away}
            </span>
          </div>
        </div>
        <RadioButtons
          name="coinToss"
          onChange={setCt}
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
          onChange={setFhPossession}
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
          onChange={setDirection}
          buttonInfos={[
            {
              id: "directionLeft",
              text: <FaArrowLeft title="directionLeft" />,
              value: "directionLeft",
            },
            {
              id: "directionRight",
              text: <FaArrowRight title="directionRight" />,
              value: "directionRight",
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

export default connect(mapStateToProps, { saveGameSetup, saveOfficials })(
  Officials
);
