import { useEffect, useState } from "react";
import { Gameday } from "../../types";
import { Button, Table } from "react-bootstrap";

type Props = {
  gamedays: Gameday[];
  onClick: (gamedayId: number) => void;
};

const Gamedays: React.FC<Props> = ({ gamedays, onClick }) => {
  const [activeRow, setActiveRow] = useState<null | number>(null);
  useEffect(() => {
    if (gamedays.length === 1) {
      setActiveRow(gamedays[0].id);
    }
  }, [gamedays]);

  return (
    <>
      {!activeRow && <h3>Bitte einen Spieltag auswählen</h3>}
      <Table striped hover>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gamedays.length === 0 && (
            <tr className="text-center fw-bold">
              <td colSpan={3}>Keine Spieltage verfügbar</td>
            </tr>
          )}
          {gamedays.map((gameday) => (
            <tr
              key={gameday.id}
              className={
                gameday.id === activeRow || gamedays.length === 1
                  ? "table-success"
                  : ""
              }
            >
              <td>{gameday.date}</td>
              <td>{gameday.name}</td>
              <td>
                <Button
                  onClick={() => {
                    setActiveRow(gameday.id);
                    onClick(gameday.id);
                  }}
                  variant="success"
                  size="sm"
                >
                  Auswählen
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
};

export default Gamedays;
