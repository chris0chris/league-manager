import { useEffect, useState } from "react";
import { getPasscheckData } from "../common/games";
import { Game, GameList, GameOverviewInfo, Gameday } from "../common/types";
import useMessage from "../hooks/useMessage";
import { ApiError } from "../utils/api";
import GameCard from "./GameCard";
import { Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";

function GameOverview() {
  const [games, setGames] = useState<GameList>([]);
  const [gamedays, setGamedays] = useState<Gameday[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [officials, setOfficials] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [showAllGamedays, setShowAllGamedays] = useState<boolean>(false);
  const { setMessage } = useMessage();
  const { gamedayId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getPasscheckData(gamedayId)
      .then((result: GameOverviewInfo) => {
        setGames(result.games);
        setOfficials(result.officialsTeamName);
        setGamedays(result.gamedays);
        setMessage({ text: "" });
        setLoading(false);
      })
      .catch((error: ApiError) => {
        setMessage({ text: error.message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamedayId]);

  return (
    <>
      {loading && <p>loading...</p>}
      {!loading && (
        <>
          <h2>Bitte ein Spiel auswählen:</h2>
          {games.map((game: Game, index: number) => (
            <GameCard key={index} game={game} />
          ))}
          <div className="row mt-5">
            <div className="col">
              <Form.Check
                type={"checkbox"}
                id="select-all-gamedays-checkbox"
                label="Alle Spiele auswählen"
                onClick={() => {
                  setShowAllGamedays(!showAllGamedays);
                  if (showAllGamedays) {
                    navigate("/");
                  }
                }}
              />
            </div>
          </div>
          {showAllGamedays && (
            <div className="row mt-2">
              <div className="col">
                <Form.Select
                  onChange={(event) =>
                    navigate(`/gameday/${event.target.value}`)
                  }
                >
                  <option>Bitte Spieltag auswählen</option>
                  {gamedays.map((currentGameday, index) => (
                    <option key={index} value={currentGameday.id}>
                      {currentGameday.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default GameOverview;
