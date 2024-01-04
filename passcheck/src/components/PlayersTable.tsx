import PlayerLine from "./PlayerLine";
import PlayerModal from "./PlayerModal";
import Table from "react-bootstrap/Table";
import { useEffect, useState } from "react";
import { jsonTypePlayer } from "../common/types";

interface Props {
  players: jsonTypePlayer;
  increasePlayersCount(): void;
  decreasePlayersCount(): void;
  initModal: boolean;
  resetPageLoad(): void;
}

//component that shows all available players on the team in a table
function PlayersTable({
  players,
  increasePlayersCount,
  decreasePlayersCount,
  initModal,
  resetPageLoad,
}: Props) {
  const [searchInput, setSearchInput] = useState(""); //Filter players by last name
  const onChange = (event: any) => {
    //Searchbar is being used
    setSearchInput(event.target.value);
  };
  const [playersData, setPlayersData] = useState(players); //store array with indexes in useState
  const [modalKey, setModalKey] = useState<number>(0); //store current key to keep track of the active player
  const [modalVisible, setModalVisible] = useState<boolean>(false); //set modal for playerview visible or invisible
  const showModal = (key: number) => {
    //set modal visible
    setModalKey(playersData[key].key);
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
      <input
        className="form-control me-2"
        id="searchbar"
        type="search"
        placeholder="Spieler Suchen"
        aria-label="Search"
        onChange={onChange}
        value={searchInput}
      />
      <Table bordered hover size="sm" className="rounded-table">
        <thead>
          <tr>
            <th className="table-border">Lfd</th>
            <th className="table-border">Name</th>
            <th className="table-border">Trikot</th>
            <th className="table-border">Pass</th>
          </tr>
        </thead>
        <tbody>
          {playersData
            .filter((player: any) => {
              const searchTerm = searchInput.toLowerCase();
              const playerName = player.name.toLowerCase();
              return playerName.startsWith(searchTerm);
            })
            .map(
              (
                player: any //map each player in the array into one row of a table
              ) => (
                <tr
                  className={player.checked ? "table-success" : ""}
                  key={player.key}
                  onClick={() => {
                    //click the row to show the modal with the players infos
                    showModal(player.key);
                  }}
                >
                  <PlayerLine //create one component for each row of the table
                    key={player.key}
                    playersData={playersData}
                    index={player.key}
                  />
                </tr>
              )
            )}
        </tbody>
      </Table>
      <PlayerModal //load the modal with details about the active player
        modalVisible={modalVisible}
        handleClose={handleClose}
        playersData={playersData}
        index={modalKey} //active player
        //handle different cases for jumping to next player inside the modal
        increaseIndex={() => {
          setModalKey(modalKey + 1);
        }}
        decreaseIndex={() => {
          setModalKey(modalKey - 1);
        }}
        minIndex={() => {
          //chose wether or not you want to loop at the end or just close the modal
          //setModalKey(0);
          handleClose();
        }}
        maxIndex={() => {
          setModalKey(playersData.length - 1);
        }}
        increasePlayersCount={increasePlayersCount}
        decreasePlayersCount={decreasePlayersCount}
      />
    </>
  );
}

export default PlayersTable;
