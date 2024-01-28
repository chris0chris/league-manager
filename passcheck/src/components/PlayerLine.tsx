//import { useState } from "react";
import {Player} from '../common/types';

interface Props {
  playersData: Player;
}

//component that fills one row of the table in PlayersOverview
function PlayerLine({playersData: player}: Props) {
  return (
    <>
      <td className='table-border'>{player.key + 1}</td>
      <td className='table-border'>
        <span>
          {player.first_name} {player.last_name}
        </span>
      </td>
      <td className='table-border'>{player.jersey_number}</td>
      <td className='table-border'>{player.pass_number}</td>
    </>
  );
}

export default PlayerLine;
