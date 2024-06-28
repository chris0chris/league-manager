import React, { useEffect, useState } from "react";
import { Table, Button, Form } from "react-bootstrap";
import { Game } from "../../types";

interface Props {
  games: Game[];
  displayAll: boolean;
  onClick: (index: number) => void;
  loadAllGames: (loadAll: boolean) => void;
}

const Games: React.FC<Props> = ({
  games,
  displayAll,
  onClick: emitEvent,
  loadAllGames,
}) => {
  const [loadAll, setLoadAll] = useState(displayAll);
  useEffect(() => {
    setLoadAll(displayAll);
  }, [displayAll]);

  return (
    <>
      <h3>Bitte Spiel auswählen</h3>
      <Table striped hover>
        <thead>
          <tr>
            <th>Start</th>
            <th>Feld</th>
            <th>Offizielle</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {games.length === 0 && (
            <tr className="text-center fw-bold">
              <td colSpan={4}>Keine Spiele zu pfeifen</td>
            </tr>
          )}
          {games.map((game: Game) => (
            <tr key={game.id}>
              <td>{game.scheduled}</td>
              <td>{game.field}</td>
              <td>
                <strong>{game.officials}</strong>
                <br />
                {game.home} vs {game.away}
              </td>
              <td>
                {game.isFinished && (
                  <Button
                    onClick={() => emitEvent(game.id)}
                    variant="danger"
                    size="sm"
                  >
                    Bearbeiten
                  </Button>
                )}
                {!game.isFinished && (
                  <Button
                    onClick={() => emitEvent(game.id)}
                    variant="success"
                    size="sm"
                  >
                    Auswählen
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-5">
        <Form.Check
          type="checkbox"
          id="formCheck"
          label="Zeige alle Spiele"
          checked={loadAll}
          onChange={() => {
            setLoadAll(!loadAll);
            loadAllGames(!loadAll);
          }}
        />
      </div>
    </>
  );
};
export default Games;
