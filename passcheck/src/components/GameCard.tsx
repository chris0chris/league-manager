import {useState} from 'react';
import {Button} from 'react-bootstrap';
import {Card} from 'react-bootstrap';
import ListGroup from 'react-bootstrap/ListGroup';
import {jsonTypeTeam, apiGames, Game} from '../common/types';
import {PLAYERS_URL} from '../common/urls';

import {useNavigate} from 'react-router-dom';

interface Props {
  loadIndex: (game: Game) => void;
  officialsTeam: string;
  game: Game;
}

function GameCard({officialsTeam, game, loadIndex}: Props) {
  const [checkedTeam, setChecked] = useState<boolean>(false);
  const navigate = useNavigate();
  const clickHandler = () => {
    console.log('index:', game);
    /* setChecked(!checkedTeam);
    teams[index].checked = checkedTeam;
    console.log(teams[index].checked); */
    loadIndex(game);
    navigate('/teams');
  };

  //console.log('gamesTC:', games);

  return (
    <div className='card-div'>
      <Card style={{width: '20rem'}}>
        <Card.Img variant='top'></Card.Img>
        <Card.Header>
          {game.home.name} - {game.away.name}
        </Card.Header>
        <Card.Body>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              Kickoff: {game.scheduled.slice(0, 5)} Uhr
            </ListGroup.Item>
            <ListGroup.Item>Feld {game.field}</ListGroup.Item>
            <ListGroup.Item>
              {checkedTeam && (
                <span style={{color: 'green'}}>
                  Passcheck bereits durchgeführt
                </span>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
        <Card.Footer>
          <Button
            className='full-width-button'
            variant='primary'
            onClick={clickHandler}
          >
            {!checkedTeam ? (
              <span>Zum Passcheck</span>
            ) : (
              <span>Passcheck aktualisieren</span>
            )}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default GameCard;
