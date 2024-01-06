import { Button } from "react-bootstrap";
import TeamCard from "./TeamCard";
import Headerdata from "./Headerdata"
import { useState, useEffect } from "react";
import { jsonTypeGames } from "../common/types"
//import { getGames, getOfficials, getTeams, getGamedays } from "../common/games";
import {getPasscheckData} from "../common/games";

interface Props {
    index: number;
    games: jsonTypeGames;
    officials: string;
    loadTeam: (team: string) => void;
}

function TeamOverview({ index, games, officials, loadTeam }: Props) {

  return (
    <>
        <h1>{games[index].home} - {games[index].away}</h1>
            <div>
              <TeamCard team={games[index].home} index={index} games={games} loadTeam={loadTeam} />
            </div>
            <div>
              <TeamCard team={games[index].away} index={index} games={games} loadTeam={loadTeam} />
            </div>
    </>
  );
}

export default TeamOverview;
