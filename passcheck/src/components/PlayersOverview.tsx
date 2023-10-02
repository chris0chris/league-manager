import PlayersTable from "./PlayersTable";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";

var playersUnsorted = require("../data/players.json"); //store entire json object in variable
const players = playersUnsorted.sort((a: any, b: any) => {
  //sort players by shirtnumber ascending
  return a.shirtnumber < b.shirtnumber ? -1 : 1;
});
const playersWithKeys = players.map((obj: any, index: any) => ({
  //map index to every object inside the array
  ...obj,
  key: index,
}));

//component that shows all available players on the team in a table
function PlayersOverview() {
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
        players={playersWithKeys}
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
        className="full-widht-button"
      >
        Passliste "Teamname" II
      </Button>
      <br />
      <br />
      {showSecondTeam && (
        <PlayersTable
          players={playersWithKeys}
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
          className="officialNameInput"
        />
      </div>
      <div>
        <Button
          variant="success"
          type="submit"
          onClick={showModal}
          className="full-widht-button"
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
