//import { useState } from "react";
import { jsonTypePlayerlist } from "../common/types";

interface Props {
  playersData: jsonTypePlayerlist;
  index: number;
}

//component that fills one row of the table in PlayersOverview
function PlayerLine({ playersData, index }: Props) {
  return (
    <>
      <td className="table-border">{playersData[index].key + 1}</td>
      <td className="table-border">
        <span>
          {playersData[index].name} {playersData[index].lastname}
        </span>
      </td>
      <td className="table-border">{playersData[index].trikotnumber}</td>
      <td className="table-border">{playersData[index].passnumber}</td>
    </>
  );
}

export default PlayerLine;
