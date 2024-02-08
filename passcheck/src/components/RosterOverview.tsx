import {SyntheticEvent, useEffect, useState} from 'react';
import {Accordion, Badge, FloatingLabel, Form} from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useNavigate, useParams} from 'react-router-dom';
import {getPlayerList as getRosterList, submitRoster} from '../common/games';
import {Player, Roster, Team, TeamData} from '../common/types';
import useMessage from '../hooks/useMessage';
import {ApiError} from '../utils/api';
import Validator from '../utils/validation';
import RosterTable from './PlayersTable';

function RosterOverview() {
  const {setMessage} = useMessage();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showStartButton, setShowStartButton] = useState<boolean>(true);
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [updateFlag, setUpdateFlag] = useState<boolean>(false);
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
  useEffect(() => {
    getRosterList(teamId!, gamedayId!)
      .then((result: TeamData) => {
        setAdditionalTeams(result.additionalTeams);
        setTeam(result.team);
        setOfficialName(result.official_name);
      })
      .catch((error: ApiError) => {
        setMessage({text: error.message});
      });
  }, [teamId, gamedayId]);

  useEffect(() => {
    if (getAllSelectedPlayers().length && officialName) {
      setShowStartButton(false);
    }
    checkValidation();
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
    setMessage({text: ''});
    navigate('/');
  };

  const onSubmitRoster = () => {
    submitRoster(teamId!, gamedayId!, officialName, getAllSelectedPlayers());
    handleClose();
    navigate('/success');
  };
  const additionalPlayersList = additionalTeams.flatMap((value: Team) =>
    value.roster.filter((player) => player.isSelected)
  );

  const getAllSelectedPlayers = () => {
    const selectedPlayers = team.roster.filter(
      (player: Player) => player.isSelected
    );
    return [...selectedPlayers, ...additionalPlayersList];
  };
  const countCheckedPlayersFor = (roster: Roster): number => {
    return roster.filter((player: Player) => player.isSelected).length;
  };
  const getAllRoster = () => {
    let allRoster: Roster = team.roster;
    additionalTeams.forEach((currentTeam: Team) => {
      allRoster = [...allRoster, ...currentTeam.roster];
    });
    return allRoster;
  };
  const checkValidation = () => {
    const validator = new Validator(team.validator, getAllRoster());
    validator.validateAndUpdate(setMessage);
    setUpdateFlag(!updateFlag);
  };

  return (
    <>
      <Button onClick={handleClickEvent}>Auswahl abbrechen</Button>
      <h2>Spielerliste {team.name}</h2>
      <RosterTable
        team={team}
        showModal={showPlayerModal}
        onUpdate={checkValidation}
        allSelectedPlayers={getAllSelectedPlayers()}
        onModalClose={() => {
          setShowStartButton(false);
          checkValidation();
        }}
      />
      <Accordion defaultActiveKey={[]} alwaysOpen className='mb-2'>
        {additionalTeams.map((team: Team, index: number) => (
          <Accordion.Item key={index} eventKey={`${index}`}>
            <Accordion.Header>
              <div className='additional-team-header'>
                {team.name}{' '}
                {countCheckedPlayersFor(team.roster) !== 0 && (
                  <Badge bg='success'>
                    <i
                      className='bi bi-check-lg'
                      style={{fontSize: '1rem'}}
                    ></i>
                    {'  '}
                    {countCheckedPlayersFor(team.roster)}
                  </Badge>
                )}
              </div>
            </Accordion.Header>
            <Accordion.Body>
              <RosterTable
                key={index}
                team={team}
                allSelectedPlayers={getAllSelectedPlayers()}
                showModal={false}
                onUpdate={checkValidation}
                onModalClose={() => setShowStartButton(false)}
              />
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
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
        <form onSubmit={handleSubmit}>
          <FloatingLabel
            controlId='officialNameInput'
            label='Vor- und Nachname Official'
            className='mb-3'
          >
            <Form.Control
              type='text'
              placeholder='Vor- und Nachname Official'
              required
              value={officialName}
              onChange={(event) => setOfficialName(event.target.value)}
            />
          </FloatingLabel>
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
            Anzahl Spielende: {getAllSelectedPlayers().length}
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
