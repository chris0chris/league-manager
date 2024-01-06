import { Button } from "react-bootstrap";
import TeamCard from "./TeamCard";
import { useState, useEffect } from "react";
//import { getGames, getOfficials, getTeams, getGamedays } from "../common/games";
import {getGames} from "../common/games";
let teamDataJSON = require("../data/teams.json"); //let api handle
const teamsWithKeys = teamDataJSON.teamlist.map((obj: any, index: any) => ({
  ...obj,
  key: index,
}));



const clickHandler = () =>
{
    return;
}

function TeamOverview(this: any) {

  //window.location.href = "/scorecard/";

  const [games, setGames] = useState<any>([]);
  const [officials, setOfficials] = useState<string>("");
  const [teams, setTeams] = useState<any>([]);
  const [gamedays, setGamedays] = useState<any>([]);
  const [tokenKey, setTokenKey] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem('token');
    if(token !== null){
        setTokenKey(token.slice(0,8));
        if(tokenKey !== ""){
            getGames(tokenKey).then((result) => {
                setGames(result);
                console.log('getGamesResult', result);
            });
        }
    }else{
        //window.location.href = "/scorecard/";
    };
  },[tokenKey]);

  return (
    <>
      {teamsWithKeys.map((team: any) => (
        <div>
          <TeamCard index={team.key} teams={teamsWithKeys} games={games}/>
        </div>
      ))}
    </>
  );
}

export default TeamOverview;
