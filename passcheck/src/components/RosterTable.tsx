import {useEffect, useState} from 'react';
import Table from 'react-bootstrap/Table';
import {Player, Roster, Team, TeamValidator} from '../common/types';
import Validator from '../utils/validation';
import PlayerLine from './PlayerLine';
import PlayerModal from './PlayerModal';

type Props = {
  team: Team;
  filteredRoster: Roster;
  showModal: boolean;
  allSelectedPlayers: Player[];
  onUpdate(): void;
  onModalClose(): void;
};

function RosterTable({
  team,
  filteredRoster,
  showModal,
  allSelectedPlayers,
  onModalClose,
  onUpdate,
}: Props) {
  const [modalPlayer, setModalPlayer] = useState<Player>({
    id: -1,
    first_name: 'Loading ...',
    last_name: 'Loading ...',
    pass_number: -1,
    jersey_number: -1,
    isSelected: false,
  });
  const [modalVisible, setModalVisible] = useState<boolean>(showModal);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [jerseyNumberValidator, setJerseyNumberValidator] = useState(
    new Validator({jerseyNumberBetween: {min: 0, max: 99}}, [])
  );
  useEffect(() => {
    if (filteredRoster[0]) {
      setModalPlayer(filteredRoster[currentPlayerIndex]);
    }
  }, [filteredRoster]);

  useEffect(() => {
    setJerseyNumberValidator(
      new Validator(
        {jerseyNumberBetween: {min: 0, max: 99}},
        allSelectedPlayers
      )
    );
  }, [allSelectedPlayers]);
  useEffect(() => {
    setModalVisible(showModal);
  }, [showModal]);
  const showModalFor = (player: Player) => {
    setModalPlayer(player);
    setModalVisible(true);
  };
  const handleClose = () => {
    setModalVisible(false);
    onModalClose();
  };
  const checkValidation = () => {
    const teamValidator = new Validator(team.validator, team.roster);
    teamValidator.validateAndUpdate();
  };
  const handleNextPlayer = (value: number | null) => {
    let index = 0;
    if (value) {
      index = currentPlayerIndex + value;
    }
    onUpdate();
    switch (index) {
      case filteredRoster.length:
        setCurrentPlayerIndex(0);
        setModalPlayer(filteredRoster[0]);
        handleClose();
        return;
      case -1:
        break;
      default:
        setCurrentPlayerIndex(index);
        setModalPlayer(filteredRoster[index]);
    }
  };
  checkValidation();
  return (
    <>
      <Table bordered hover size='sm' className='rounded-table'>
        <thead>
          <tr>
            <th className='table-border'>Trikot</th>
            <th className='table-border'>Name</th>
            <th className='table-border'>Passnr</th>
          </tr>
        </thead>
        <tbody>
          {filteredRoster.map((player: Player, index: number) => (
            <tr
              className={`${player?.isSelected ? 'table-success' : ''} ${
                player?.validationError ? 'disabled-row' : ''
              }`}
              key={index}
              onClick={() => {
                showModalFor(player);
                setCurrentPlayerIndex(index);
              }}
            >
              <PlayerLine key={index} playersData={player} />
            </tr>
          ))}
        </tbody>
      </Table>
      <PlayerModal
        modalVisible={modalVisible}
        handleClose={handleClose}
        nextPlayer={(value: number | null): void => handleNextPlayer(value)}
        player={modalPlayer}
        validator={jerseyNumberValidator}
      />
    </>
  );
}

export default RosterTable;
