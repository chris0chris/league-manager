import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

export const Officials = (props) => {
  const selectedGame = props.selectedGame;
  return (
    <div className="container">
      <h4 className="mt-2">
        Feld {selectedGame.field}: {selectedGame.home} vs {selectedGame.away}
      </h4>
      <form className="">
        <div className="form-floating mt-3">
          <input
            type="text"
            className="form-control"
            id="scJudgeName"
            placeholder="Scorecard Judge-Name"
            required
          />
          <label htmlFor="scJudgeName" className="form-label">
            Scorecard Judge-Name
          </label>
        </div>
        <div className="form-floating mt-3">
          <input
            type="text"
            className="form-control"
            id="referee"
            placeholder="Referee-Name"
            required
          />
          <label htmlFor="referee" className="form-label">
            Referee-Name
          </label>
        </div>
        <div className="form-floating mt-3">
          <input
            type="text"
            className="form-control"
            id="downJudge"
            placeholder="Down Judge-Name"
            required
          />
          <label htmlFor="downJudge" className="form-label">
            Down Judge-Name
          </label>
        </div>
        <div className="form-floating mt-3">
          <input
            type="text"
            className="form-control"
            id="fieldJudge"
            placeholder="Field Judge-Name"
            required
          />
          <label htmlFor="fieldJudge" className="form-label">
            Field Judge-Name
          </label>
        </div>
        <div className="form-floating mt-3">
          <input
            type="text"
            className="form-control"
            id="sideJudge"
            placeholder="Side Judge-Name"
            required
          />
          <label htmlFor="sideJudge" className="form-label">
            Side Judge-Name
          </label>
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

// Officials.propTypes = {
//   props: PropTypes,
// };

const mapStateToProps = (state) => ({
  games: state.gamesReducer.games,
  selectedGame: state.gamesReducer.selectedGame,
});

export default connect(mapStateToProps)(Officials);
