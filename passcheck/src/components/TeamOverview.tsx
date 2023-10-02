//import teams from "../data/teams.json";
import TeamButton from "./TeamButton";
import { useState } from "react";

var teams = require("../data/teams.json");

console.log(teams);

function TeamOverview(this: any) {
  return (
    <>
      {teams.map((team: any) => (
        <div>
          <TeamButton
            key={team.teamName}
            teamName={team.teamName}
            league={team.league}
            checked={teams.checked}
          />
        </div>
      ))}
    </>
  );
}

export default TeamOverview;
