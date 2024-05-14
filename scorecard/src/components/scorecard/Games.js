import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { stringToBoolean } from "../common/urls";

const Games = ({ games, onClick: emitEvent, loadAllGames }) => {
  const [loadAll, setLoadAll] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loadAllGames = stringToBoolean(searchParams.get("loadAll"));
    setLoadAll(loadAllGames);
  }, [searchParams]);

  return (
    <>
      <h3>Bitte Spiel auswählen</h3>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Start</th>
            <th>Feld</th>
            <th>Offizielle</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {games.length == 0 && (
            <tr className="text-center fw-bold">
              <td colSpan="4">Keine Spiele zu pfeifen</td>
            </tr>
          )}
          {games.map((game, index) => (
            <tr key={game.id}>
              <td>{game.scheduled}</td>
              <td>{game.field}</td>
              <td>
                <strong>{game.officials}</strong>
                <br />
                {game.home} vs {game.away}
              </td>
              <td>
                <button
                  onClick={() => emitEvent(index)}
                  className="btn btn-success btn-sm"
                >
                  Start
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-5">
        <div className="form-check">
          <input
            className="form-check-input"
            onChange={() => {
              loadAllGames(!loadAll);
            }}
            type="checkbox"
            id="formCheck"
            value=""
            checked={loadAll}
          />
          <label className="form-check-label" htmlFor="formCheck">
            Zeige alle Spiele
          </label>
        </div>
      </div>
    </>
  );
};

Games.propTypes = {
  games: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired,
  loadAllGames: PropTypes.func.isRequired,
};

export default Games;
