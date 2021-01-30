import React from "react";

const Games = ({ games, onClick: emitEvent }) => {
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
          {games.map((game) => (
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
                  onClick={() => emitEvent(game.id)}
                  className="btn btn-success btn-sm"
                >
                  Start
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default Games;
