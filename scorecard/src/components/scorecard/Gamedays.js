import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";

const Gamedays = ({ gamedays }) => {
  return (
    <>
      <h3>Bitte einen Spieltag auswählen</h3>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gamedays.map((gameday) => (
            <tr key={gameday.id}>
              <td>{gameday.date}</td>
              <td>{gameday.name}</td>
              <td>
                <button className="btn btn-success btn-sm">Auswählen </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

Gamedays.propTypes = {
  gamedays: PropTypes.array.isRequired,
};

export default Gamedays;
