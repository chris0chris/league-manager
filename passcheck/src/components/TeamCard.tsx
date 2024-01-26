import {useState} from 'react';
import {Button} from 'react-bootstrap';
import {Card} from 'react-bootstrap';
import ListGroup from 'react-bootstrap/ListGroup';
import {jsonTypeTeam, jsonTypeGames, apiGames, apiTeam} from '../common/types';
import {PLAYERS_URL} from '../common/urls';

import {useNavigate} from 'react-router-dom';

interface Props {
  team: apiTeam;
  index: number;
  games: jsonTypeGames;
  loadTeam: (team: apiTeam) => void;
  playersLoaded: boolean;
}

function TeamCard({team, games, index, loadTeam, playersLoaded}: Props) {
  const [checkedTeam, setChecked] = useState<boolean>(false);
  const navigate = useNavigate();
  const clickHandler = () => {
    //console.log("Pythonfunktion ausführen mit " + teams[index].name);
    /* setChecked(!checkedTeam);
    teams[index].checked = checkedTeam;
    console.log(teams[index].checked); */
    loadTeam(team);
  };

  if (playersLoaded) {
    navigate('/players');
  }

  //console.log('gamesTC:', games);

  return (
    <div className='card-div'>
      <Card style={{width: '20rem'}}>
        <Card.Img variant='top'></Card.Img>
        <Card.Header>{team.name}</Card.Header>
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
              <span>Passcheck durchführen</span>
            ) : (
              <span>Passcheck aktualisieren</span>
            )}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default TeamCard;
