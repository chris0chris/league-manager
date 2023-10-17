//import { useState } from "react";

type jsonTypePlayer = {
  gecheckt: boolean;
  key: number;
  playerid: string;
  name: string;
  lastname: string;
  passnumber: string;
  shirtnumber: number;
}[];

type jsonType = {
  gecheckt: boolean;
  key: number;
  name: string;
  passnumber: string;
  shirtnumber: number;
}[];

interface Props {
  playersData: jsonType;
  index: number;
}

//component that fills one row of the table in PlayersOverview
function PlayerLine({ playersData, index }: Props) {
  return (
    <>
      <td className="table-border">{playersData[index].key + 1}</td>
      <td className="table-border">
        <span>{playersData[index].name}</span>
      </td>
      <td className="table-border">{playersData[index].shirtnumber}</td>
      <td className="table-border">{playersData[index].passnumber}</td>
    </>
  );
}

export default PlayerLine;
