import {useEffect, useState} from 'react';
import Table from 'react-bootstrap/Table';
import {Player, Roster} from '../common/types';
import PlayerLine from './PlayerLine';
import PlayerModal from './PlayerModal';

interface Props {
  teamName: string;
  roster: Roster;
  showModal: boolean;
  onModalClose(): void;
}

//component that shows all available players on the team in a table
function PlayersTable({teamName, roster, showModal, onModalClose}: Props) {
  const [searchInput, setSearchInput] = useState(''); //Filter players by last name
  const onChange = (event: any) => {
    //Searchbar is being used
    setSearchInput(event.target.value);
  };
  const [modalPlayer, setModalPlayer] = useState<Player>({
    id: -1,
    first_name: 'Loading ...',
    last_name: 'Loading ...',
    pass_number: -1,
    jersey_number: -1,
    isSelected: false,
  }); //store current key to keep track of the active player
  const [modalVisible, setModalVisible] = useState<boolean>(showModal); //set modal for playerview visible or invisible
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const showModalFor = (player: Player) => {
    console.log('showModal player', player);
    setModalPlayer(player);
    setModalVisible(true);
  };
  useEffect(() => {
    if (roster[0]) {
      setModalPlayer(roster[0]);
    }
  }, [roster]);
  useEffect(() => {
    setModalVisible(showModal);
  }, [showModal]);
  const handleClose = () => {
    setModalVisible(false);
    onModalClose();
  };
  const handleNextPlayer = (value: number | null) => {
    let index = 0;
    if (value) {
      index = currentPlayerIndex + value;
    }
    switch (index) {
      case roster.length:
        setCurrentPlayerIndex(0);
        setModalPlayer(roster[0]);
        handleClose();
        break;
      case -1:
        break;
      default:
        setCurrentPlayerIndex(index);
        setModalPlayer(roster[index]);
    }
  };
  const numberSelectedPlayers = (): number => {
    return roster.filter((player: Player) => player.isSelected).length;
  };

  return (
    <>
      <h2>
        Spielerliste {teamName}        
      </h2>
      <input
        className='form-control me-2'
        id='searchbar'
        type='search'
        placeholder='Spieler Suchen'
        aria-label='Search'
        onChange={onChange}
        value={searchInput}
      />
      <div>
        Ausgewählte Personen: {numberSelectedPlayers()}
      </div>
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
          {roster
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
                  //click the row to show the modal with the players infos
                  showModalFor(player);
                  setCurrentPlayerIndex(index);
                }}
              >
                <PlayerLine //create one component for each row of the table
                  key={index}
                  index={index}
                  playersData={player}
                />
              </tr>
            ))}
        </tbody>
      </Table>
      <PlayerModal //load the modal with details about the active player
        modalVisible={modalVisible}
        handleClose={handleClose}
        nextPlayer={(value: number | null): void => handleNextPlayer(value)}
        player={modalPlayer} //active player
        //handle different cases for jumping to next player inside the modal
      />
    </>
  );
}

export default PlayersTable;
