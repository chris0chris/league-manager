import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import RadioButton from "../layout/RadioButton";
import { FaStopwatch } from "react-icons/fa";

const Details = (props) => {
  const selectedGame = props.selectedGame;
  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <RadioButton
            id="home"
            name="teamName"
            onChange={() => {}}
            value={selectedGame.home}
            text={
              <>
                {selectedGame.home}{" "}
                <span
                  className="badge bg-warning"
                  style={{
                    marginLeft: "15px",
                    width: "45px",
                    fontSize: "15px",
                  }}
                >
                  {selectedGame.points_home}
                </span>
              </>
            }
          />
        </div>
        {/* <div className="col-2">a</div>
        <div className="col-2">b</div> */}
        <div className="col-6">
          <RadioButton
            id="away"
            name="teamName"
            onChange={() => {}}
            value={selectedGame.away}
            text={
              <>
                <span
                  className="badge bg-warning"
                  style={{
                    marginRight: "15px",
                    width: "45px",
                    fontSize: "15px",
                  }}
                >
                  {selectedGame.points_away}
                </span>{" "}
                {selectedGame.away}
              </>
            }
          />
        </div>
      </div>
      <div className="row">
        <div className="col-2 mt-2">
          <button type="button" className="btn btn-secondary">
            <FaStopwatch />
          </button>
        </div>
        <div className="col-2 mt-2">
          <button type="button" className="btn btn-secondary">
            <FaStopwatch />
          </button>
        </div>
        <div className="col-4 mt-2 d-grid">
          <button type="button" className="btn btn-secondary">
            Halbzeit
          </button>
        </div>
        <div className="col-2 mt-2">
          <button type="button" className="btn btn-secondary">
            <FaStopwatch />
          </button>
        </div>
        <div className="col-2 mt-2">
          <button type="button" className="btn btn-secondary">
            <FaStopwatch />
          </button>
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
