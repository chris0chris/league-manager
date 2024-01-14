import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {jsonTypePlayerlist} from '../common/types';

interface Props {
  modalVisible: boolean;
  handleClose(): any;
  playersData: jsonTypePlayerlist;
  index: number;
  increaseIndex(): void;
  decreaseIndex(): void;
  maxIndex(): void;
  minIndex(): void;
  increasePlayersCount(): void;
  decreasePlayersCount(): void;
  gameday: number;
}

function PlayerModal({
  modalVisible,
  handleClose,
  playersData,
  index,
  increaseIndex,
  decreaseIndex,
  minIndex,
  maxIndex,
  increasePlayersCount,
  decreasePlayersCount,
  gameday,
}: Props) {
  const update = () => {
    //Invert the checked status of the player
    if (playersData[index].gamedays.includes(gameday)) {
      playersData[index].gamedays.splice(
        playersData[index].gamedays.indexOf(gameday),
        1
      );
      decreasePlayersCount();
    } else {
      playersData[index].gamedays.push(gameday);
      increasePlayersCount();
    }
    //playersData[index].checked = !playersData[index].checked;
    //Increase or decrease active player count for final output
    //playersData[index].checked
  };

  const nextPlayer = () => {
    index < playersData.length - 1 && increaseIndex();
    index === playersData.length - 1 && minIndex(); //Edgecase last player in the list
  };

  return (
    <>
      <Modal
        show={modalVisible}
        onHide={handleClose}
        backdrop='static'
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {playersData[index].first_name} {playersData[index].last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='span-div'>
            <span className='left-span'>Name:</span>
            <span className='right-span'>
              {playersData[index].first_name} {playersData[index].last_name}
            </span>
          </div>
          <div className='span-div'>
            <span className='left-span'>Trikotnummer:</span>
            <span className='right-span'>
              {playersData[index].jersey_number}
            </span>
          </div>
          <div className='span-div'>
            <span className='left-span'>Passnummer:</span>
            <span className='right-span'>{playersData[index].pass_number}</span>
          </div>
        </Modal.Body>
        <Modal.Footer className='modal-footer'>
          <Button
            variant='secondary'
            className='modal-button-left me-auto'
            onClick={() => {
              index > 0 && decreaseIndex();
              index === 0 && maxIndex(); //Edgecase first player in the list
            }}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='26'
              height='26'
              fill='currentColor'
              className='bi bi-arrow-left'
              viewBox='0 0 16 16'
            >
              <path
                fill-rule='evenodd'
                d='M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z'
              />
            </svg>
          </Button>
          <Button
            variant={
              playersData[index].gamedays.includes(gameday)
                ? 'danger'
                : 'success'
            } //coloring the button depending on the state of the player
            className='modal-button-middle'
            onClick={() => {
              update(); //Switch boolean of property "checked"
              playersData[index].gamedays.includes(gameday) && nextPlayer(); //Automatically load Modal with next Player in list when you check a player
            }}
          >
            {/* following section alters icon depending on the state of the player */}
            {!playersData[index].gamedays.includes(gameday) && (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='30'
                height='30'
                fill='currentColor'
                className='bi bi-check2'
                viewBox='0 0 16 16'
              >
                <path d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z' />
              </svg>
            )}
            {playersData[index].gamedays.includes(gameday) && (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='30'
                height='30'
                fill='currentColor'
                className='bi bi-x'
                viewBox='0 0 16 16'
              >
                <path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z' />
              </svg>
            )}
          </Button>
          <Button
            variant='secondary'
            className='modal-button-right ms-auto'
            onClick={nextPlayer}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='26'
              height='26'
              fill='currentColor'
              className='bi bi-arrow-right'
              viewBox='0 0 16 16'
            >
              <path
                fill-rule='evenodd'
                d='M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z'
              />
            </svg>
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PlayerModal;
