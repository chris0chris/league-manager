import React, { useState } from "react";
import PropTypes from "prop-types";

const Gamedays = ({ gamedays, onClick: getGames }) => {
  const [activeRow, setActiveRow] = useState(null);
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
            <tr
              key={gameday.id}
              className={gameday.id === activeRow ? "bg-success" : ""}
              data-testid="row-entry"
            >
              <td>{gameday.date}</td>
              <td>{gameday.name}</td>
              <td>
                <button
                  onClick={(e) => {
                    setActiveRow(gameday.id);
                    getGames(gameday.id);
                  }}
                  className="btn btn-success btn-sm"
                >
                  Auswählen
                </button>
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
  onClick: PropTypes.func.isRequired,
};

export default Gamedays;
