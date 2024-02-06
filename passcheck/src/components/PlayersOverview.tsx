import {SyntheticEvent, useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useNavigate, useParams} from 'react-router-dom';
import {getPlayerList as getRosterList, submitRoster} from '../common/games';
import {Player, Roster, Team} from '../common/types';
import RosterTable from './PlayersTable';
import Validator from '../utils/validation';

//component that shows all available players on the team in a table
function RosterOverview() {
  const [showAdditionalRosters, setShowAdditionalRosters] =
    useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false); //set modal for playerview visible or invisible
  const [showStartButton, setShowStartButton] = useState(true);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [updateFlag, setUpdateFlag] = useState(false);
  const [team, setTeam] = useState<Team>({
    name: 'Loading...',
    roster: [],
    validator: {},
  });
  const [additionalTeams, setAdditionalTeams] = useState<Team[]>([]);
  const [officialName, setOfficialName] = useState<string>('');
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
      (result: {
        team: Team;
        additionalTeams: Team[];
        official_name: string;
      }) => {
        setAdditionalTeams(result.additionalTeams);
        setTeam(result.team);
        setOfficialName(result.official_name);
      }
    );
  }, [teamId, gamedayId]);

  useEffect(() => {
    if (getCheckedPlayers().length) {
      setShowStartButton(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, additionalTeams]);

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    setModalVisible(true);
  };
  const handleClose = () => {
    setModalVisible(false);
  };

  const handleClickEvent = () => {
    navigate('/');
  };

  const onSubmitRoster = () => {
    submitRoster(teamId!, gamedayId!, officialName, getCheckedPlayers());
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
    return [...selectedPlayers, ...additionalPlayersList];
  };
  const checkValidation = () => {
    const validator = new Validator(team.validator);
    let allRoster: Roster = team.roster;
    additionalTeams.forEach((currentTeam: Team) => {
      allRoster = [...allRoster, ...currentTeam.roster];
    });
    validator.validateAndUpdate(allRoster);
    setUpdateFlag(!updateFlag);
  };

  return (
    <>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <RosterTable
        team={team}
        showModal={showPlayerModal}
        onUpdate={checkValidation}
        onModalClose={() => {
          setShowStartButton(false);
          checkValidation();
        }}
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
        additionalTeams.map((team: Team, index: number) => (
          <RosterTable
            key={index}
            team={team}
            showModal={false}
            onUpdate={checkValidation}
            onModalClose={() => setShowStartButton(false)}
          />
        ))}
      {showStartButton && !officialName && (
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
        <form onSubmit={handleSubmit}>
          <div>
            <input
              type='text'
              placeholder='Vor- und Nachname Official'
              required
              className='officialNameInput form-control me-2'
              value={officialName}
              onChange={(event) => setOfficialName(event.target.value)}
            />
          </div>
          <div>
            <Button
              variant='success'
              type='submit'
              className='full-width-button'
            >
              Passliste abschicken
            </Button>
          </div>
        </form>
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
          <div className='mb-2'>
            Anzahl Spielende: {getCheckedPlayers().length}
          </div>
          <div className='mb-2'>Team: {team.name}</div>
          <div>Abgenommen durch: {officialName}</div>
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
