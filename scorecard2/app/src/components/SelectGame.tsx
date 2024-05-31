import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { OFFICIALS_URL } from "../common/routes";

const SelectGame: React.FC = () => {
  const [isSelectedGameLoaded, setSelectedGameLoaded] = useState(false);
  const [gamesForGamedayLoaded, setGamesForGamedayLoaded] = useState(false);
  const [selectedGamedayId, setSelectedGamedayId] = useState<number | null>(
    null,
  );
  useEffect(
    () => {
      //   props.getGamedays();
    },
    [
      /* props.gamedays.length */
    ],
  );

  const loadGamesForGameday = (id: number) => {
    //   props.getGames(id, props.user.username);
    setSelectedGamedayId(id);
    setGamesForGamedayLoaded(true);
  };
  const loadAllGames = (loadAll: boolean) => {
    if (loadAll) {
      //   props.getGames(selectedGamedayId, "*");
    } else {
      //   props.getGames(selectedGamedayId, props.user.username);
    }
  };

  const loadGame = (index: number) => {
    // props.setSelectedGame(props.games[index]);
    // props.getOfficials(props.games[index].id);
    // props.getGameSetup(props.games[index].id);
    // props.getTeamOfficials(props.games[index].officialsId);
    setSelectedGameLoaded(true);
  };
  if (isSelectedGameLoaded) {
    return <Navigate to={OFFICIALS_URL} />;
  }
  return (
    <div>
      GAMEDAYS
      <br />
      GAMES
      {/* <Gamedays gamedays={props.gamedays} onClick={loadGamesForGameday} />
      {gamesForGamedayLoaded && (
        <Games
          games={props.games}
          onClick={loadGame}
          loadAllGames={loadAllGames}
        /> */}
      )
    </div>
  );
};
export default SelectGame;
