import PlayersOverview from './components/PlayersOverview';
import TeamOverview from './components/TeamOverview';
import GameOverview from './components/GameOverview';
import {useState, useEffect} from 'react';
import Button from 'react-bootstrap/Button';

import {getPasscheckData, getPlayerList} from './common/games';

import {HashRouter as Router, Route, Routes} from 'react-router-dom';
import {Game, GameList, Roster, apiTeam} from './common/types';
import {
  SUCCESS_URL,
  PLAYERS_URL,
  ROOT_URL,
  TEAMS_URL,
  PASSCHECK_URL,
} from './common/routes';

//import {TEAMS_URL, PLAYERS_URL} from "./common/urls";

function App() {
  //componentDidMount() {
  const [games, setGames] = useState<GameList>([]);
  const [officials, setOfficials] = useState<string>('');
  const [tokenKey, setTokenKey] = useState<string>('');
  const [gameIndex, setGameIndex] = useState<Game>({
    away: {id: -1, name: 'away team'},
    field: -1,
    gameday: -1,
    home: {id: -1, name: 'home team'},
    gameday_id: -1,
    officials: -1,
    scheduled: '00:00',
  });
  const [team, setTeam] = useState<apiTeam>({id: -1, name: 'Loading ...'});
  const [playerlist, setPlayerlist] = useState<Roster>([]);
  const [otherPlayers, setOtherPlayers] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [playersLoaded, setPlayersLoaded] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token !== null) {
      setTokenKey(token.slice(0, 8));
      if (tokenKey !== '') {
        getPasscheckData().then((result) => {
          setGames(result.games);
          setOfficials(result.officialsTeamName);
          setLoading(false);
        });
      }
    }
  }, [tokenKey]);

  const loadIndex = (game: Game) => {
    console.log('loadIndex:', game);
    setGameIndex(game);
  };

  const loadTeam = (team: apiTeam) => {
    console.log('loadTeam :>>', gameIndex, team);
    setTeam(team);
    if (team && playerlist.length === 0) {
      getPlayerList(team.id, gameIndex.gameday_id).then((result) => {
        console.log('result :>>', result);
        setLoading(false);
        setOtherPlayers(result.additionalRosters);
        setPlayerlist(result.roster);
        setPlayersLoaded(true);
      });
    }
  };

  if (loading) {
    return <p>loading...</p>;
  }
  return (
    <>
      <Router>
        <div>
          <Routes>
            <Route
              path={ROOT_URL}
              element={
                <GameOverview
                  games={games}
                  officials={officials}
                  loadIndex={loadIndex}
                />
              }
            />
            <Route
              path={TEAMS_URL}
              element={
                <TeamOverview
                  game={gameIndex}
                  officials={officials}
                  loadTeam={loadTeam}
                  playersLoaded={playersLoaded}
                />
              }
            />
            <Route
              path={PLAYERS_URL}
              element={
                <PlayersOverview
                  team={team}
                  gameday={gameIndex.gameday_id}
                  players={playerlist}
                  otherPlayers={otherPlayers}
                />
              }
            />
            <Route
              path={SUCCESS_URL}
              element={
                <div>
                  <main style={{padding: '1rem'}}>
                    <p>Passcheck erfolgreich!</p>
                  </main>
                  <Button
                    onClick={() => {
                      window.location.href = PASSCHECK_URL;
                    }}
                  >
                    Zurück
                  </Button>
                </div>
              }
            />
            <Route
              path='*'
              element={
                <main style={{padding: '1rem'}}>
                  <p>There is nothing here!</p>
                </main>
              }
            />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
