import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";

const Gamedays = (props) => {
  useEffect(() => {
    console.log("useEffect called", props);
    props.getGamedays();
  }, []);
  return (
    <>
      <h3>Bitte einen Spieltag auswählen</h3>
      <table className="table table-striped">
        <thead>
          <th>Datum</th>
          <th>Name</th>
          <th />
          <tr></tr>
        </thead>
        <tbody>
          {props.gamedays.map((gameday) => (
            <tr key={gameday.id}>
              <td>{gameday.date}</td>
              <td>{gameday.name}</td>
              <td>
                <button className="btn btn-success btn-sm">Auswählen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
});

Gamedays.propTypes = {
  gamedays: PropTypes.array.isRequired,
};

export default connect(mapStateToProps, { getGamedays })(Gamedays);
