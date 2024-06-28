import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { OFFICIALS_URL } from "../../common/routes";
import Gamedays from "./Gamedays";
import { Game, Gameday, GamedaysOverview, SelectedGame } from "../../types";
import { loadGamedays, loadGamesForGameday } from "../../common/api/gameDays";
import useNotification from "../../hooks/useNotification";
import Games from "./Games";

const SelectGame: React.FC = () => {
  const { setNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGame, setSelectedGame] = useState<SelectedGame>({
    isSelected: false,
    gameId: -1,
  });
  const [displayedGames, setDisplayedGames] = useState<Game[]>([]);
  const [gamedays, setGamedays] = useState<Gameday[]>([]);
  const [gameday, setGameday] = useState<Gameday>({
    date: "",
    games: [],
    id: 0,
    name: "",
  });
  const [gamedaysOverview, setGamedaysOverview] = useState<GamedaysOverview>({
    officiatingTeamId: 0,
    gamedays: [],
  });
  console.log("rendering selectgame");

  const [gamesForGamedayLoaded, setGamesForGamedayLoaded] = useState(false);
  const [displayAllGames, setDisplayAllGames] = useState(false);

  const updateSearchParams = useCallback(
    (gamedayId: number) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("id", `${gamedayId}`);
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gamedaysOverview = await loadGamedays();
        setGamedaysOverview(gamedaysOverview);
        setGamedays(gamedaysOverview.gamedays);
        console.log("gamedays set :>>", gamedaysOverview);
        if (gamedaysOverview.gamedays.length === 1) {
          const gameday = gamedaysOverview.gamedays[0];
          setDisplayedGames(gameday.games);
          setGameday(gameday);
          updateSearchParams(gameday.id);
        } else {
          setDisplayedGames([]);
          setGameday({
            date: "",
            games: [],
            id: 0,
            name: "",
          });
        }
      } catch (error: any) {
        setNotification({ text: error.message });
      }
    };
    const id = searchParams.get("id");
    if (!id) {
      fetchData();
    }
  }, [setNotification, updateSearchParams]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setGamesForGamedayLoaded(false);
      if (searchParams.size > 0) {
        setNotification({ text: "Bitte einen Spieltag auswählen!" });
      }
      return;
    }
    loadGameday(parseInt(id));
  }, [searchParams]);

  const loadGameday = async (gamedayId: number) => {
    const selectedGameday = gamedays.find(
      (gameday) => gameday.id === gamedayId,
    );
    let games: Game[] = [];
    if (!selectedGameday) {
      try {
        const gamedaysOverview = await loadGamesForGameday(gamedayId);
        setGamedaysOverview(gamedaysOverview);
        setGamedays(gamedaysOverview.gamedays);
        if (gamedaysOverview.gamedays.length === 1) {
          games = gamedaysOverview.gamedays[0].games;
          setGameday(gamedaysOverview.gamedays[0]);
        }
      } catch (error: any) {
        setNotification({ text: error.message });
        setDisplayedGames([]);
        setGameday({
          date: "",
          games: [],
          id: 0,
          name: "",
        });
      }
    } else {
      setGameday(selectedGameday);
      games = selectedGameday.games;
    }
    setDisplayedGames(games);
    setGamesForGamedayLoaded(true);
  };

  useEffect(() => {
    console.log(
      "ue gamedaysOverview :>>",
      !gamedaysOverview.gamedays,
      gamedaysOverview.gamedays,
    );
    if (gamedaysOverview.gamedays.length === 0) {
      return;
    }
    console.log(
      "ue games & co",
      displayAllGames,
      gameday.games,
      displayedGames,
    );
    if (displayAllGames) {
      if (JSON.stringify(displayedGames) !== JSON.stringify(gameday.games)) {
        setDisplayedGames(gameday.games);
      }
      return;
    }
    const gamesFound = gameday.games.filter(
      (currentGame) =>
        currentGame.officialsId === gamedaysOverview.officiatingTeamId,
    );
    if (gamesFound.length > 0) {
      if (JSON.stringify(displayedGames) !== JSON.stringify(gamesFound)) {
        setDisplayedGames(gamesFound);
      }
      setDisplayAllGames(false);
    } else {
      if (JSON.stringify(displayedGames) !== JSON.stringify(gameday.games)) {
        setDisplayedGames(gameday.games);
      }
      setDisplayAllGames(true);
    }
  }, [
    displayAllGames,
    displayedGames,
    gameday.games,
    gamedaysOverview.gamedays,
    gamedaysOverview.officiatingTeamId,
  ]);

  const loadGame = (gameId: number) => {
    setSelectedGame({
      isSelected: true,
      gameId: gameId,
    });
  };

  if (selectedGame.isSelected) {
    return <Navigate to={`${OFFICIALS_URL}?gameId=${selectedGame.gameId}`} />;
  }
  return (
    <div>
      <Gamedays gamedays={gamedays} onClick={updateSearchParams} />
      <Games
        games={displayedGames}
        displayAll={displayAllGames}
        onClick={loadGame}
        loadAllGames={(displayAll: boolean) => {
          console.log("loadAllGanes :>>", displayAll);
          setDisplayAllGames(displayAll);
        }}
      />
    </div>
  );
};
export default SelectGame;
