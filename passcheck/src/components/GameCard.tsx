import {Button, Card} from 'react-bootstrap';
import {TEAM_URL} from '../common/routes';
import {Game} from '../common/types';

interface Props {
  game: Game;
}

function GameCard({game}: Props) {
  return (
    <div className='card-div'>
      <Card>
        <Card.Img variant='top'></Card.Img>
        <Card.Header>
          {game.scheduled.slice(0, 5)} Uhr: Feld {game.field}
        </Card.Header>
        <Card.Body>
          <div className='d-grid gap-2'>
            <Button
              href={`/#${TEAM_URL}/${game.home.id}/gameday/${game.gameday_id}`}
              variant={`${game.home.isChecked ? 'success' : 'primary'}`}
              size='lg'
            >
              {game.home.name}
            </Button>
            <Button
              href={`/#${TEAM_URL}/${game.away.id}/gameday/${game.gameday_id}`}
              variant={`${game.away.isChecked ? 'success' : 'primary'}`}
              size='lg'
            >
              {game.away.name}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default GameCard;
