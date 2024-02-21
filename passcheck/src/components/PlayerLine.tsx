import {Player} from '../common/types';

type Props = {
  playersData: Player;
};

function PlayerLine({playersData: player}: Props) {
  return (
    <>
      <td className='table-border'>{player.jersey_number}</td>
      <td className='table-border'>
        <span>
          {player.first_name} {player.last_name}
        </span>
      </td>
      <td className='table-border'>{player.pass_number}</td>
    </>
  );
}

export default PlayerLine;
