import {SyntheticEvent, useEffect, useRef, useState} from 'react';
import {
  Accordion,
  Badge,
  CloseButton,
  FloatingLabel,
  Form,
} from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {AccordionEventKey} from 'react-bootstrap/esm/AccordionContext';
import {useNavigate, useParams} from 'react-router-dom';
import {getPlayerList as getRosterList, submitRoster} from '../common/games';
import {Player, Roster, Team, TeamData} from '../common/types';
import {MessageColor} from '../context/MessageContext';
import useMessage from '../hooks/useMessage';
import {ApiError} from '../utils/api';
import Validator from '../utils/validation';
import RosterTable from './RosterTable';

function RosterOverview() {
  const {setMessage} = useMessage();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showStartButton, setShowStartButton] = useState<boolean>(true);
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [updateFlag, setUpdateFlag] = useState<boolean>(false);
  const [team, setTeam] = useState<Team>({
    name: 'Loading...',
    roster: [],
    validator: {},
  });
  const [additionalTeams, setAdditionalTeams] = useState<Team[]>([]);
  const [officialName, setOfficialName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredAdditionalRosters, setFilteredAdditionalRosters] = useState<
    Roster[]
  >([]);
  const [filteredRoster, setFilteredRoster] = useState<Roster>([]);
  const [activeAccordionKey, setActiveAccordionKey] = useState<string[] | null>(
    null
  );
  const searchQueryRef = useRef<HTMLInputElement>(null);
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
    setFilteredRoster(rosterFilter(team.roster));
    let additionalRostersFiltered: Roster[] = [];
    additionalTeams.forEach((currentTeam) => {
      additionalRostersFiltered = [
        ...additionalRostersFiltered,
        rosterFilter(currentTeam.roster),
      ];
    });
    setFilteredAdditionalRosters(additionalRostersFiltered);
    checkValidation();
  }, [searchQuery, team, JSON.stringify(additionalTeams)]);
  const rosterFilter = (roster: Roster) => {
    const lowercasedQuery = searchQuery.toLowerCase();
    return roster.filter(
      (player) =>
        player.first_name.toLowerCase().includes(lowercasedQuery) ||
        player.last_name.toLowerCase().includes(lowercasedQuery) ||
        player.pass_number.toString().includes(lowercasedQuery) ||
        player.jersey_number.toString().includes(lowercasedQuery)
    );
  };
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

  const getPlayerCounterElement = (roster: Roster) => {
    if (countCheckedPlayersFor(roster) === 0) {
      return null;
    }
    return (
      <Badge bg='success'>
        <i className='bi bi-check-lg' style={{fontSize: '1rem'}}></i>
        {'  '}
        {countCheckedPlayersFor(roster)}
      </Badge>
    );
  };

  const onSubmitRoster = () => {
    handleClose();
    submitRoster(teamId!, gamedayId!, officialName, getAllSelectedPlayers())
      .then(() => {
        setMessage({
          text: 'Erfolgreich gespeichert.',
          color: MessageColor.Success,
        });
        navigate('/');
      })
      .catch((error: ApiError) => setMessage({text: error.message}));
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
    setIsValid(validator.validateAndUpdate(setMessage));
    setUpdateFlag(!updateFlag);
  };

  return (
    <>
      <Button
        onClick={handleClickEvent}
        className='full-width-button mt-1 mb-2'
      >
        Auswahl abbrechen
      </Button>
      <h2>
        Spielendenliste {team.name}{' '}
        {getPlayerCounterElement(getAllSelectedPlayers())}
      </h2>
      <div className='row g-2 mb-3'>
        <div className='col position-relative'>
          <FloatingLabel
            controlId='playerListSearch'
            label={`${
              additionalTeams.length > 0
                ? 'Listen durchsuchen ...'
                : team.name + ' durchsuchen ...'
            }`}
          >
            <Form.Control
              type='text'
              placeholder={`${
                additionalTeams.length > 0
                  ? 'Listen durchsuchen ...'
                  : team.name + ' durchsuchen ...'
              }`}
              required
              value={searchQuery}
              ref={searchQueryRef}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setActiveAccordionKey(
                  filteredAdditionalRosters.map((_, index) => `${index}`)
                );
              }}
            />
          </FloatingLabel>
          {searchQuery.length > 0 && (
            <CloseButton
              className='btn-close position-absolute top-50 translate-middle'
              style={{right: '5px'}}
              onClick={() => {
                setSearchQuery('');
                searchQueryRef.current!.focus();
              }}
            />
          )}
        </div>
      </div>
      <RosterTable
        team={team}
        filteredRoster={filteredRoster}
        showModal={showPlayerModal}
        onUpdate={checkValidation}
        allSelectedPlayers={getAllSelectedPlayers()}
        onModalClose={() => {
          setShowStartButton(false);
          checkValidation();
        }}
      />
      <Accordion
        defaultActiveKey={[]}
        activeKey={activeAccordionKey}
        alwaysOpen
        onSelect={(key: AccordionEventKey) => {
          setActiveAccordionKey(
            key === activeAccordionKey ? null : (key as string[])
          );
        }}
        className='mb-2'
      >
        {filteredAdditionalRosters.map((roster: Roster, index: number) => (
          <Accordion.Item key={index} eventKey={`${index}`}>
            <Accordion.Header>
              <div className='additional-team-header'>
                {additionalTeams[index].name}{' '}
                {getPlayerCounterElement(additionalTeams[index].roster)}
              </div>
            </Accordion.Header>
            <Accordion.Body>
              <RosterTable
                key={index}
                team={additionalTeams[index]}
                filteredRoster={roster}
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
              disabled={
                getAllSelectedPlayers().length <
                team.validator.minimum_player_strength!
              }
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
