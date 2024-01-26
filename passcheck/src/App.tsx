import PlayersOverview from './components/PlayersOverview';
import TeamOverview from './components/TeamOverview';
import GameOverview from './components/GameOverview';
import {useState, useEffect} from 'react';
import Button from 'react-bootstrap/Button';

import {getPasscheckData, getPlayerList} from './common/games';

import {HashRouter as Router, Route, Routes} from 'react-router-dom';
import {apiTeam} from './common/types';

//import {TEAMS_URL, PLAYERS_URL} from "./common/urls";

function App() {
  //componentDidMount() {
  const [games, setGames] = useState<any>([]);
  const [gamesWithKeys, setGamesWithKeys] = useState<any>([]);
  const [officials, setOfficials] = useState<string>('');
  const [tokenKey, setTokenKey] = useState<string>('');
  const [gameIndex, setGameIndex] = useState<number>(0);
  const [team, setTeam] = useState<apiTeam>();
  const [playerlist, setPlayerlist] = useState<any>([]);
  const [playersWithKeys, setPlayersWithKeys] = useState<any>([]);
  const [otherPlayers, setOtherPlayers] = useState<any>([]);
  const [otherPlayersWithKeys, setOtherPlayersWithKeys] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [playersLoaded, setPlayersLoaded] = useState<boolean>(false);
  let otherPlayersFound = false;

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
    } else {
      //window.location.href = "/scorecard/";
    }
  }, [tokenKey]);

  const loadIndex = (index: number) => {
    setGameIndex(index);
  };

  const loadTeam = (team: apiTeam) => {
    setTeam(team);
    if (team && playerlist.length === 0) {
      getPlayerList(team.id).then((result) => {
        setLoading(false);
        if (
          result.roster.length !== 0 &&
          result.additionalRosters.length !== 0
        ) {
          setOtherPlayers(result.additionalRosters);
          setPlayerlist(result.roster);
          otherPlayersFound = true;
          if (otherPlayersFound && otherPlayersWithKeys.length === 0) {
            const keys = result.additionalRosters.map(
              (obj: any, index: any) => ({
                ...obj,
                key: index,
              })
            );
            setOtherPlayersWithKeys(keys);
          }
          if (playersWithKeys.length === 0) {
            const keys = result.roster.map((obj: any, index: any) => ({
              ...obj,
              key: index,
            }));
            setPlayersWithKeys(keys);
          }
        }
      });
    }
  };

  useEffect(() => {
    if (playersWithKeys.length !== 0 && otherPlayersWithKeys.length !== 0) {
      setPlayersLoaded(true);
    }
  }, [playersWithKeys, otherPlayersWithKeys]);

  useEffect(() => {
    const keys = games.map((obj: any, index: any) => ({
      ...obj,
      key: index,
    }));
    setGamesWithKeys(keys);
  }, [games]);

  if (loading) {
    return <p>loading...</p>;
  }
  return (
    <>
      <Router>
        <div>
          <Routes>
            <Route
              path='/'
              element={
                <GameOverview
                  gamesWithKeys={gamesWithKeys}
                  officials={officials}
                  loadIndex={loadIndex}
                />
              }
            />
            <Route
              path='/teams'
              element={
                <TeamOverview
                  index={gameIndex}
                  games={gamesWithKeys}
                  officials={officials}
                  loadTeam={loadTeam}
                  playersLoaded={playersLoaded}
                />
              }
            />
            <Route
              path='/players'
              element={
                <PlayersOverview
                  team={team}
                  gameday={games[gameIndex].gameday_id}
                  players={playersWithKeys}
                  otherPlayers={otherPlayersWithKeys}
                />
              }
            />
            <Route
              path='/success'
              element={
                <div>
                  <main style={{padding: '1rem'}}>
                    <p>Passcheck erfolgreich!</p>
                  </main>
                  <Button
                    onClick={() => {
                      window.location.href = '/passcheck/';
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
