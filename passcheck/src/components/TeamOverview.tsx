//import teams from "../data/teams.json";
import { Button } from "react-bootstrap";
import TeamCard from "./TeamCard";
import { useState, useEffect } from "react";

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
  return (
    <>
    <div>
      Bitte Spieltag auswählen:
      <Button onClick={clickHandler} >gameday</Button>
    </div>
      {teamsWithKeys.map((team: any) => (
        <div>
          <TeamCard index={team.key} teams={teamsWithKeys} />
        </div>
      ))}
    </>
  );
}

export default TeamOverview;
