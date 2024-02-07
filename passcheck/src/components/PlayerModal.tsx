import {useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {Player} from '../common/types';

interface Props {
  modalVisible: boolean;
  handleClose(): any;
  nextPlayer(value: number | null): void;
  player: Player;
}

function PlayerModal({modalVisible, handleClose, nextPlayer, player}: Props) {
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
    player.isSelected = !player.isSelected;
    nextPlayer(1);
  };

  const handleDoubleClick = () => {
    const isSure = window.confirm(
      'Wirklich 100 % sicher, dass die Person am Spieltag teilnehmen darf?!'
    );
    if (isSure) {
      update();
    }
  };
  return (
    <>
      <Modal
        show={modalVisible}
        onHide={() => {
          handleClose();
          nextPlayer(null);
        }}
        backdrop='static'
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {player.first_name} {player.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='row'>
            <div className='col-4'>Name:</div>
            <div className='col-8'>
              {player.first_name} {player.last_name}
            </div>
          </div>
          <div className='row'>
            <div className='col-4'>Trikotnummer:</div>
            <div className='col-8'>{player.jersey_number}</div>
          </div>
          <div className='row'>
            <div className='col-4'>Passnummer:</div>
            <div className='col-8'>{player.pass_number}</div>
          </div>
          {player.validationError && (
            <div className='row text-bg-danger'>
              <div className='col-4'>Achtung:</div>
              <div className='col-8'>{player.validationError}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className='modal-footer'>
          <Button
            variant='secondary'
            className='modal-button-left me-auto'
            onClick={() => nextPlayer(-1)}
          >
            <i className='bi bi-arrow-left'></i>
          </Button>
          {player.validationError && (
            <>
              {!player.isSelected && (
                <Button
                  variant={'danger'}
                  className='modal-button-middle'
                  style={{opacity: 0.5}}
                  onClick={() => {
                    setClick(click + 1);
                  }}
                >
                  <i className='bi bi-check2'></i>
                </Button>
              )}
              {player.isSelected && (
                <Button
                  variant={'danger'}
                  className='modal-button-middle'
                  onClick={() => update()}
                >
                  <i className='bi bi-x-lg'></i>
                </Button>
              )}
            </>
          )}
          {!player.validationError && (
            <Button
              variant={player.isSelected ? 'danger' : 'success'} //coloring the button depending on the state of the player
              className='modal-button-middle'
              onClick={() => {
                update();
              }}
            >
              {!player.isSelected && <i className='bi bi-check2'></i>}
              {player.isSelected && <i className='bi bi-x-lg'></i>}
            </Button>
          )}
          <Button
            variant='secondary'
            className='modal-button-right ms-auto'
            onClick={() => nextPlayer(1)}
          >
            <i className='bi bi-arrow-right'></i>
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PlayerModal;
