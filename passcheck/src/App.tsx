import Headerdata from "./components/Headerdata";
import PlayersOverview from "./components/PlayersOverview";
import TeamOverview from "./components/TeamOverview";
import GameOverview from "./components/GameOverview";
import { useState, useEffect } from "react";

import { getPasscheckData, getPlayerList } from "./common/games"


import {
  HashRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';

//import {TEAMS_URL, PLAYERS_URL} from "./common/urls";



function App() {

    const [games, setGames] = useState<any>([]);
    const [gamesWithKeys, setGamesWithKeys] = useState<any>([]);
    const [officials, setOfficials] = useState<string>("");
    const [tokenKey, setTokenKey] = useState<string>("");
    const [index, setIndex] = useState<number>(0);
    const [team, setTeam] = useState<string>("");
    const [playerlist, setPlayerlist] = useState<any>([]);
    const [playersWithKeys, setPlayersWithKeys] = useState<any>([]);
    const [otherPlayers, setOtherPlayers] = useState<any>([]);

    const loadIndex = (index: number) => {
        setIndex(index);
    }

    const loadTeam = (team: string) => {
        setTeam(team);
    }

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token !== null){
            setTokenKey(token.slice(0,8));
            if(tokenKey !== ""){
                getPasscheckData(tokenKey).then((result) => {
                    setGames(result.games);
                    setOfficials(result.officialsTeamName);
                });
            }
        }else{
            //window.location.href = "/scorecard/";
        };
    },[tokenKey]);

    useEffect(() => {
        const keys = games.map((obj: any, index: any) => ({
            ...obj,
            key: index,
        }));
        setGamesWithKeys(keys);

    },[games]);

    if(team !== ""){
        getPlayerList(team).then((result) => {
            if(result.players.length !== 0){
                    console.log('useStatePlayerlist', result.players);
                    setPlayerlist(result.players);
                    console.log('playerlist:', playerlist);
            }
            //setOtherPlayers(result.otherPlayers);
        });
    }

    //funktioniert nicht
    useEffect(() => {
        const keys = playerlist.map((obj: any, index: any) => ({
            ...obj,
            key: index,
        }));
        setPlayersWithKeys(keys);
        console.log('playerskeys:', playerlist);

    },[playerlist]);

  return (
    <>
      <Router>
          <div>
              <Routes>
                <Route path="/" element={<GameOverview gamesWithKeys={gamesWithKeys} officials={officials} loadIndex={loadIndex} />}/>
                <Route path="/teams" element={<TeamOverview index={index} games={gamesWithKeys} officials={officials} loadTeam={loadTeam} />}/>
                <Route path="/players" element={<PlayersOverview team={team} players={playersWithKeys} otherPlayers={otherPlayers} />}/>
                <Route path="*" element={
                    <main style={{padding: '1rem'}}>
                        <p>There is nothing here!</p>
                    </main>}/>
              </Routes>
          </div>
      </Router>
    </>
  );
}

export default App;
