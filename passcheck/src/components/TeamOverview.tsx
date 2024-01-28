import {Button} from 'react-bootstrap';
import TeamCard from './TeamCard';
import {apiTeam, Game} from '../common/types';
import {useNavigate} from 'react-router-dom';

interface Props {
  game: Game;
  officials: string;
  loadTeam: (team: apiTeam) => void;
  playersLoaded: boolean;
}

function TeamOverview({game, officials, loadTeam, playersLoaded}: Props) {
  const navigate = useNavigate();
  const handleClickEvent = () => {
    navigate('/');
  };

  return (
    <>
      <h1>
        {game.home.name} - {game.away.name}
      </h1>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <br />
      <div>
        <TeamCard
          team={game.home}
          game={game}
          loadTeam={loadTeam}
          playersLoaded={playersLoaded}
        />
      </div>
      <br />
      <div>
        <TeamCard
          team={game.away}
          game={game}
          loadTeam={loadTeam}
          playersLoaded={playersLoaded}
        />
      </div>
    </>
  );
}

export default TeamOverview;
