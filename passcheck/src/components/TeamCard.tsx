import { useState } from "react";
import { Button } from "react-bootstrap";
import { Card } from "react-bootstrap";
import ListGroup from "react-bootstrap/ListGroup";
import { jsonTypeTeam } from "../data/types";

interface Props {
  index: number;
  teams: jsonTypeTeam;
}

function TeamCard({ index, teams }: Props) {
  const [checkedTeam, setChecked] = useState<boolean>(teams[index].checked);

  const clickHandler = () => {
    console.log("Pythonfunktion ausführen mit " + teams[index].name);
    setChecked(!checkedTeam);
    teams[index].checked = checkedTeam;
  };

  return (
    <div className="card-div">
      <Card style={{ width: "20rem" }}>
        <Card.Img variant="top"></Card.Img>
        <Card.Header>{teams[index].name}</Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>Kickoff: Platzhalter</ListGroup.Item>
            <ListGroup.Item>Feld: Platzhalter</ListGroup.Item>
            <ListGroup.Item>
              {checkedTeam && (
                <span style={{ color: "green" }}>
                  Passcheck bereits durchgeführt
                </span>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
        <Card.Footer>
          <Button
            className="full-width-button"
            variant="primary"
            onClick={clickHandler}
          >
            Passcheck durchführen
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default TeamCard;
