import {useState} from 'react';
import {Button} from 'react-bootstrap';
import {Card} from 'react-bootstrap';
import ListGroup from 'react-bootstrap/ListGroup';
import {jsonTypeTeam, jsonTypeGames, apiGames} from '../common/types';
import {PLAYERS_URL} from '../common/urls';

import {useNavigate} from 'react-router-dom';

interface Props {
  index: number;
  loadIndex: (index: number) => void;
  officialsTeam: string;
  games: jsonTypeGames;
}

function GameCard({index, officialsTeam, games, loadIndex}: Props) {
  const [checkedTeam, setChecked] = useState<boolean>(false);
  const navigate = useNavigate();
  const clickHandler = () => {
    console.log('index:', index);
    /* setChecked(!checkedTeam);
    teams[index].checked = checkedTeam;
    console.log(teams[index].checked); */
    loadIndex(index);
    navigate('/teams');
  };

  //console.log('gamesTC:', games);

  return (
    <div className='card-div'>
      <Card style={{width: '20rem'}}>
        <Card.Img variant='top'></Card.Img>
        <Card.Header>
          {games[index].home.name} - {games[index].away.name}
        </Card.Header>
        <Card.Body>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              Kickoff: {games[index].scheduled.slice(0, 5)} Uhr
            </ListGroup.Item>
            <ListGroup.Item>Feld {games[index].field}</ListGroup.Item>
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
