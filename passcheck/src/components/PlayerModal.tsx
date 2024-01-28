import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {Roster} from '../common/types';
import {useEffect, useState} from 'react';

interface Props {
  modalVisible: boolean;
  handleClose(): any;
  playersData: Roster;
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
  playersData: roster,
  index,
  increaseIndex,
  decreaseIndex,
  minIndex,
  maxIndex,
  increasePlayersCount,
  decreasePlayersCount,
  gameday,
}: Props) {
  const [click, setClick] = useState<number>(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      // simple click
      setClick(0);
    }, 250);

    // the duration between this click and the previous one
    // is less than the value of delay = double-click
    if (click === 2) {
      handleDoubleClick();
    }

    return () => clearTimeout(timer);
  }, [click]);
  const update = () => {
    //Invert the checked status of the player
    if (roster[index].isSelected) {
      roster[index].isSelected = false;
      decreasePlayersCount();
    } else {
      roster[index].isSelected = true;
      increasePlayersCount();
    }
    //playersData[index].checked = !playersData[index].checked;
    //Increase or decrease active player count for final output
    //playersData[index].checked
  };

  const nextPlayer = () => {
    index < roster.length - 1 && increaseIndex();
    index === roster.length - 1 && minIndex(); //Edgecase last player in the list
  };

  const handleDoubleClick = () => {
    const isSure = window.confirm(
      'Wirklich 100 % sicher, dass die Person am Spieltag teilnehmen darf?!'
    );

    if (isSure) {
      update();
      nextPlayer();
    }
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
            {roster[index]?.first_name} {roster[index]?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='row'>
            <div className='col-4'>Name:</div>
            <div className='col-8'>
              {roster[index]?.first_name} {roster[index]?.last_name}
            </div>
          </div>
          <div className='row'>
            <div className='col-4'>Trikotnummer:</div>
            <div className='col-8'>{roster[index]?.jersey_number}</div>
          </div>
          <div className='row'>
            <div className='col-4'>Passnummer:</div>
            <div className='col-8'>{roster[index]?.pass_number}</div>
          </div>
          {roster[index]?.validationError && (
            <div className='row text-bg-danger'>
              <div className='col-4'>Achtung:</div>
              <div className='col-8'>{roster[index]?.validationError}</div>
            </div>
          )}
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
          {roster[index]?.validationError && (
            <Button
              variant={'danger'}
              className='modal-button-middle'
              style={{opacity: 0.5}}
              onClick={() => {
                setClick(click + 1);
              }}
            >
              {!roster[index]?.isSelected && (
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
              {roster[index]?.isSelected && (
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
          )}
          {!roster[index]?.validationError && (
            <Button
              variant={roster[index]?.isSelected ? 'danger' : 'success'} //coloring the button depending on the state of the player
              className='modal-button-middle'
              onClick={() => {
                update();
                nextPlayer();
              }}
            >
              {!roster[index]?.isSelected && (
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
              {roster[index]?.isSelected && (
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
          )}
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
