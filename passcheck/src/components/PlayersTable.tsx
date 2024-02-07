import {useEffect, useState} from 'react';
import Table from 'react-bootstrap/Table';
import {Player, Team} from '../common/types';
import PlayerLine from './PlayerLine';
import PlayerModal from './PlayerModal';
import Validator from '../utils/validation';

type Props = {
  team: Team;
  showModal: boolean;
  onUpdate(): void;
  onModalClose(): void;
}

function RosterTable({team, showModal, onModalClose, onUpdate}: Props) {
  const [searchInput, setSearchInput] = useState('');
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
  useEffect(() => {
    if (team.roster[0]) {
      setModalPlayer(team.roster[0]);
    }
  }, [team]);
  useEffect(() => {
    setModalVisible(showModal);
  }, [showModal]);
  const onChange = (event: any) => {
    setSearchInput(event.target.value);
  };
  const showModalFor = (player: Player) => {
    setModalPlayer(player);
    setModalVisible(true);
  };
  const handleClose = () => {
    setModalVisible(false);
    onModalClose();
  };
  const checkValidation = () => {
    const validator = new Validator(team.validator);
    validator.validateAndUpdate(team.roster);
  };
  const handleNextPlayer = (value: number | null) => {
    let index = 0;
    if (value) {
      index = currentPlayerIndex + value;
    }
    switch (index) {
      case team.roster.length:
        setCurrentPlayerIndex(0);
        setModalPlayer(team.roster[0]);
        handleClose();
        return;
      case -1:
        break;
      default:
        setCurrentPlayerIndex(index);
        setModalPlayer(team.roster[index]);
    }
    checkValidation();
    onUpdate();
  };
  const numberSelectedPlayers = (): number => {
    return team.roster.filter((player: Player) => player.isSelected).length;
  };
  return (
    <>
      <input
        className='form-control me-2'
        id='searchbar'
        type='search'
        placeholder='Spieler Suchen'
        aria-label='Search'
        onChange={onChange}
        value={searchInput}
      />
      <div>Ausgewählte Personen: {numberSelectedPlayers()}</div>
      <Table bordered hover size='sm' className='rounded-table'>
        <thead>
          <tr>
            <th className='table-border'>Lfd</th>
            <th className='table-border'>Name</th>
            <th className='table-border'>Trikot</th>
            <th className='table-border'>Pass</th>
          </tr>
        </thead>
        <tbody>
          {team.roster
            // .filter((player: Player) => {
            //   const searchTerm = searchInput.toLowerCase();
            //   const playerName =
            //     player?.first_name.toLowerCase() +
            //     ' ' +
            //     player?.last_name.toLowerCase();
            //   return playerName.startsWith(searchTerm);
            // })
            .map((player: Player, index) => (
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
                <PlayerLine key={index} index={index} playersData={player} />
              </tr>
            ))}
        </tbody>
      </Table>
      <PlayerModal
        modalVisible={modalVisible}
        handleClose={handleClose}
        nextPlayer={(value: number | null): void => handleNextPlayer(value)}
        player={modalPlayer}
      />
    </>
  );
}

export default RosterTable;
