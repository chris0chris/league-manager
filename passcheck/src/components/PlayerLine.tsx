//import { useState } from "react";
import {jsonTypePlayerlist} from '../common/types';

interface Props {
  playersData: jsonTypePlayerlist;
  index: number;
}

//component that fills one row of the table in PlayersOverview
function PlayerLine({playersData, index}: Props) {
  return (
    <>
      <td className='table-border'>{playersData[index].key + 1}</td>
      <td className='table-border'>
        <span>
          {playersData[index].first_name} {playersData[index].last_name}
        </span>
      </td>
      <td className='table-border'>{playersData[index].jersey_number}</td>
      <td className='table-border'>{playersData[index].pass_number}</td>
    </>
  );
}

export default PlayerLine;
