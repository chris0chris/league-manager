import PlayerLine from './PlayerLine';
import PlayerModal from './PlayerModal';
import Table from 'react-bootstrap/Table';
import {useState} from 'react';
import {Player, Roster} from '../common/types';

interface Props {
  teamName: string;
  players: Roster;
  initModal: boolean;
  resetPageLoad(): void;
}

//component that shows all available players on the team in a table
function PlayersTable({
  teamName,
  players: playersData,
  initModal,
  resetPageLoad,
}: Props) {
  const [searchInput, setSearchInput] = useState(''); //Filter players by last name
  const onChange = (event: any) => {
    //Searchbar is being used
    setSearchInput(event.target.value);
  };
  const [roster, setRoster] = useState<Roster>(playersData); //store array with indexes in useState
  const [modalKey, setModalKey] = useState<number>(0); //store current key to keep track of the active player
  const [modalVisible, setModalVisible] = useState<boolean>(false); //set modal for playerview visible or invisible
  const showModal = (key: number) => {
    //set modal visible
    setModalKey(key);
    setModalVisible(true);
  };
  const handleClose = () => {
    //set modal invisible
    setModalVisible(false);
  };

  if (initModal && !modalVisible) {
    showModal(0);
    resetPageLoad();
  }

  return (
    <>
      <h2>Spielerliste {teamName}</h2>
      <input
        className='form-control me-2'
        id='searchbar'
        type='search'
        placeholder='Spieler Suchen'
        aria-label='Search'
        onChange={onChange}
        value={searchInput}
      />
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
                  showModal(index);
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
        playersData={roster}
        index={modalKey} //active player
        //handle different cases for jumping to next player inside the modal
        minIndex={() => {
          //chose wether or not you want to loop at the end or just close the modal
          //setModalKey(0);
          handleClose();
        }}
        maxIndex={() => {
          setModalKey(roster.length - 1);
        }}
      />
    </>
  );
}

export default PlayersTable;
