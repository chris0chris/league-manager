import PlayersTable from './PlayersTable';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useState, useEffect} from 'react';
import {apiTeam, Player, Roster} from '../common/types';
import {useNavigate} from 'react-router-dom';
import {submitRoster} from '../common/games';

interface Props {
  team: apiTeam;
  gameday: number;
  players: Roster;
  otherPlayers: {name: string; roster: Roster}[];
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
    getCheckedPlayers();
    setModalVisible(true);
  };
  const handleClose = () => {
    //set modal invisible
    setModalVisible(false);
  };

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
    console.log('otherPlayers', otherPlayers);
    const selectedPlayers = players.filter(
      (player: Player) => player.isSelected
    );
    const additionalPlayers = otherPlayers.flatMap((value) =>
      value.roster.filter((player) => player.isSelected)
    );
    console.log('selectedPlayers + additionalPlayers', [
      ...selectedPlayers,
      ...additionalPlayers,
    ]);
    return [...selectedPlayers, ...additionalPlayers];
  };

  return (
    <>
      <h1>Spielerliste {team?.name}</h1>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <PlayersTable teamName={team.name} players={players} initModal={false} />
      {otherPlayers.length !== 0 && (
        <>
          <Button
            variant='secondary'
            onClick={toggleSecondTeam}
            className='full-width-button'
          >
            {showSecondTeam
              ? 'weitere Teams ausblenden'
              : 'weitere Teams anzeigen'}
          </Button>
          <br />
        </>
      )}
      <br />
      {showSecondTeam &&
        otherPlayers.map((additionalTeam, index) => (
          <PlayersTable
            key={index}
            teamName={additionalTeam.name}
            players={additionalTeam.roster}
            initModal={false}
          />
        ))}
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
          <div>Es sind {getCheckedPlayers().length} Spieler anwesend.</div>
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
