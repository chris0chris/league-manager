import PlayersTable from "./PlayersTable";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";
import { jsonTypePlayerlist } from "../common/types";


interface Props {
    team: string;
    players: jsonTypePlayerlist;
    otherPlayers: jsonTypePlayerlist;
}

//component that shows all available players on the team in a table
function PlayersOverview({team, players, otherPlayers}: Props) {
  console.log("players in overview:", players)
  const [showSecondTeam, setShowSecondTeam] = useState<boolean>(false);
  const toggleSecondTeam = () => {
    setShowSecondTeam(!showSecondTeam);
  };
  const [modalVisible, setModalVisible] = useState<boolean>(false); //set modal for playerview visible or invisible
  const showModal = () => {
    //set modal visible
    setModalVisible(true);
  };
  const handleClose = () => {
    //set modal invisible
    setModalVisible(false);
  };
  const [playersCount, setPlayersCount] = useState<number>(0);
  const increasePlayersCount = () => {
    setPlayersCount(playersCount + 1);
  };
  const decreasePlayersCount = () => {
    setPlayersCount(playersCount - 1);
  };
  const [pageLoad, setPageLoad] = useState<boolean>(false);
  useEffect(() => {
    //load first modal
    setPageLoad(true);
  }, []);

  return (
    <>
      <PlayersTable
        players={players}
        increasePlayersCount={increasePlayersCount}
        decreasePlayersCount={decreasePlayersCount}
        initModal={pageLoad}
        resetPageLoad={() => {
          setPageLoad(false);
        }}
      />
      <Button
        variant="secondary"
        onClick={toggleSecondTeam}
        className="full-width-button"
      >
        Passliste {team} II
      </Button>
      <br />
      <br />
      {showSecondTeam && (
        <PlayersTable
          players={otherPlayers}
          increasePlayersCount={increasePlayersCount}
          decreasePlayersCount={decreasePlayersCount}
          initModal={false}
          resetPageLoad={() => {}}
        />
      )}
      <div>
        <input
          type="text"
          placeholder="Name Official"
          className="officialNameInput form-control me-2"
        />
      </div>
      <div>
        <Button
          variant="success"
          type="submit"
          onClick={showModal}
          className="full-width-button"
        >
          {" "}
          Passliste abschicken{" "}
        </Button>
      </div>
      <Modal
        show={modalVisible}
        onHide={handleClose}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Passliste bestätigen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>Team: "Teamname"</div>
          <div>Es sind {playersCount} Spieler anwesend.</div>
        </Modal.Body>
        <Modal.Footer className="modal-footer">
          <Button variant="secondary" className="me-auto" onClick={handleClose}>
            Zurück
          </Button>
          <Button variant="primary" className="ms-auto">
            Passliste bestätigen
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PlayersOverview;
