import {useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useNavigate, useParams} from 'react-router-dom';
import {getPlayerList as getRosterList, submitRoster} from '../common/games';
import {Player, Team} from '../common/types';
import PlayersTable from './PlayersTable';

//component that shows all available players on the team in a table
function RosterOverview() {
  const [showAdditionalRosters, setShowAdditionalRosters] =
    useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false); //set modal for playerview visible or invisible
  const [showStartButton, setShowStartButton] = useState(true);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [team, setTeam] = useState<Team>({
    name: 'Loading...',
    roster: [],
  });
  const [additionalTeams, setAdditionalTeams] = useState<Team[]>([]);
  const navigate = useNavigate();
  const {teamId} = useParams();
  const {gamedayId} = useParams();

  if (isNaN(teamId as any) || isNaN(gamedayId as any)) {
    navigate('/error', {
      state: {
        message:
          'Die URL benötigt eine TeamId und eine GamedayId als Zahl! /#/team/:teamId/gameday/:gamedayId',
      },
    });
  }
  useEffect(() => {
    getRosterList(teamId!, gamedayId!).then(
      (result: {team: Team; additionalTeams: Team[]}) => {
        setAdditionalTeams(result.additionalTeams);
        setTeam(result.team);
      }
    );
  }, [teamId, gamedayId]);

  useEffect(() => {
    if (getCheckedPlayers().length) {
      setShowStartButton(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, additionalTeams]);

  const showModal = () => {
    setModalVisible(true);
  };
  const handleClose = () => {
    setModalVisible(false);
  };

  const handleClickEvent = () => {
    navigate('/');
  };

  const onSubmitRoster = () => {
    submitRoster(teamId!, gamedayId!, getCheckedPlayers());
    handleClose();
    navigate('/success');
  };
  const additionalPlayersList = additionalTeams.flatMap((value: Team) =>
    value.roster.filter((player) => player.isSelected)
  );

  const getCheckedPlayers = () => {
    const selectedPlayers = team.roster.filter(
      (player: Player) => player.isSelected
    );

    console.log('selectedPlayers + additionalPlayers', [
      ...selectedPlayers,
      ...additionalPlayersList,
    ]);
    return [...selectedPlayers, ...additionalPlayersList];
  };

  return (
    <>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <PlayersTable
        teamName={team.name}
        roster={team.roster}
        showModal={showPlayerModal}
        onModalClose={() => setShowStartButton(false)}
      />
      {additionalTeams.length !== 0 && (
        <>
          <Button
            variant='secondary'
            onClick={() => setShowAdditionalRosters(!showAdditionalRosters)}
            className='full-width-button'
          >
            {showAdditionalRosters
              ? 'weitere Teams ausblenden'
              : `weitere Teams anzeigen ${
                  additionalPlayersList.length
                    ? ' -> ' + additionalPlayersList.length + ' ✅'
                    : ''
                }`}
          </Button>
          <br />
        </>
      )}
      <br />
      {showAdditionalRosters &&
        additionalTeams.map((roster: Team, index: number) => (
          <PlayersTable
            key={index}
            teamName={roster.name}
            roster={roster.roster}
            showModal={false}
            onModalClose={() => setShowStartButton(false)}
          />
        ))}
      {showStartButton && (
        <>
          <Button
            variant='success'
            type='button'
            onClick={() => {
              setShowPlayerModal(true);
              setShowStartButton(false);
            }}
            className='full-width-button'
          >
            Passcheck starten
          </Button>
        </>
      )}
      {!showStartButton && (
        <>
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
        </>
      )}

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

export default RosterOverview;
