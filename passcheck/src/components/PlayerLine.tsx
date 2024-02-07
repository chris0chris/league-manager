import {Player} from '../common/types';

interface Props {
  playersData: Player;
  index: number;
}

function PlayerLine({playersData: player, index}: Props) {
  return (
    <>
      <td className='table-border'>{index + 1}</td>
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
