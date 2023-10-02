//import { useState } from "react";

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
      <td>{playersData[index].key + 1}</td>
      <td>
        <span>{playersData[index].name}</span>
      </td>
      <td>{playersData[index].shirtnumber}</td>
      <td>{playersData[index].passnumber}</td>
    </>
  );
}

export default PlayerLine;
