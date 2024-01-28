import PlayersTable from './PlayersTable';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useState, useEffect} from 'react';
import {apiTeam, Player, Roster} from '../common/types';
import {useNavigate} from 'react-router-dom';
import {submitRoster} from '../common/games';

interface Props {
  team?: apiTeam;
  gameday: number;
  players: Roster;
  otherPlayers: Roster;
}

//component that shows all available players on the team in a table
function PlayersOverview({team, gameday, players, otherPlayers}: Props) {
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
  // players.reduce((count, player) => {
  //   if (player.gamedays.includes(gameday)) {
  //     count++;
  //   }
  //   return count;
  // }, 0)

  // You can use useEffect to update the count when players or gameday changes
  // // useEffect(() => {
  // //   const newPlayersCount = players.reduce((count, player) => {
  // //     if (player.gamedays.includes(gameday)) {
  // //       count++;
  // //     }
  // //     return count;
  // //   }, 0);

  //   setPlayersCount(newPlayersCount);
  // }, [players, gameday]);
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

  const navigate = useNavigate();
  const handleClickEvent = () => {
    navigate('/');
  };

  const onSubmitRoster = () => {
    submitRoster(team!.id, gameday, getCheckedPlayers());
    handleClose();
    navigate('/success');
  };

  const getCheckedPlayers = () => {
    return players.filter((player: Player) => player.isSelected);
  };

  return (
    <>
      <h1>Spielerliste {team?.name}</h1>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <PlayersTable
        players={players}
        increasePlayersCount={increasePlayersCount}
        decreasePlayersCount={decreasePlayersCount}
        initModal={pageLoad}
        resetPageLoad={() => {
          setPageLoad(false);
        }}
        gameday={gameday}
      />
      {otherPlayers.length !== 0 && (
        <>
          <Button
            variant='secondary'
            onClick={toggleSecondTeam}
            className='full-width-button'
          >
            {showSecondTeam
              ? 'weitere Pässe ausblenden'
              : 'weitere Pässe anzeigen'}
          </Button>
          <br />
        </>
      )}
      <br />
      {showSecondTeam && (
        <PlayersTable
          players={otherPlayers}
          increasePlayersCount={increasePlayersCount}
          decreasePlayersCount={decreasePlayersCount}
          initModal={false}
          resetPageLoad={() => {}}
          gameday={gameday}
        />
      )}
      <div>
        <input
          type='text'
          placeholder='Name Official'
          className='officialNameInput form-control me-2'
        />
      </div>
      <div>
        <Button
          variant='success'
          type='submit'
          onClick={showModal}
          className='full-width-button'
        >
          Passliste abschicken
        </Button>
      </div>
      <Modal
        show={modalVisible}
        onHide={handleClose}
        backdrop='static'
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Passliste bestätigen</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>Team: {team?.name}</div>
          <div>Es sind {playersCount} Spieler anwesend.</div>
        </Modal.Body>
        <Modal.Footer className='modal-footer'>
          <Button variant='secondary' className='me-auto' onClick={handleClose}>
            Zurück
          </Button>
          <Button
            variant='primary'
            onClick={onSubmitRoster}
            className='ms-auto'
          >
            Passliste bestätigen
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PlayersOverview;
