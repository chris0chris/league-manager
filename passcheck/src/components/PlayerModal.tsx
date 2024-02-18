import {useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {Player} from '../common/types';
import Validator from '../utils/validation';
import {Alert} from 'react-bootstrap';

interface Props {
  modalVisible: boolean;
  handleClose(): any;
  nextPlayer(value: number | null): void;
  player: Player;
  validator: Validator;
}

function PlayerModal({
  modalVisible,
  handleClose,
  nextPlayer,
  player,
  validator,
}: Props) {
  const [click, setClick] = useState<number>(0);
  const [jerseyNumber, setJerseyNumber] = useState(player.jersey_number);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  let timeoutTillNextPlayer = 1500;
  if (process.env.NODE_ENV === 'development') {
    timeoutTillNextPlayer = 1;
  }
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
  useEffect(() => {
    setJerseyNumber(player.jersey_number);
  }, [player]);

  const update = () => {
    if (errorMessages.length > 0) {
      return;
    }
    setShowSuccessMessage(true);
    player.isSelected = !player.isSelected;
    player.jersey_number = jerseyNumber;
    setTimeout(() => {
      nextPlayer(1);
      setShowSuccessMessage(false);
    }, timeoutTillNextPlayer);
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
          setErrorMessages([]);
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
          <div className='row mb-2 align-items-center'>
            <div className='col-4'>Name:</div>
            <div className='col-8'>
              <input
                type='text'
                className='form-control'
                disabled
                value={`${player.first_name} ${player.last_name}`}
              />
            </div>
          </div>
          <div className='row mb-2 align-items-center'>
            <div className='col-4'>Passnummer:</div>
            <div className='col-8'>
              <input
                disabled
                type='text'
                className='form-control'
                value={player.pass_number}
              />
            </div>
          </div>
          <div className='row mb-2 align-items-center'>
            <div className='col-4'>Trikotnummer:</div>
            <div className='col-8'>
              <input
                type='text'
                required
                disabled={player.isSelected || !!player.validationError}
                className='form-control'
                id='exampleFormControlInput1'
                placeholder='Trikotnummer'
                value={jerseyNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isNaN(Number(value))) {
                    const jersNumber = Number(event.target.value);
                    setJerseyNumber(jersNumber);
                    setErrorMessages(
                      validator.validateAndGetErrors({
                        ...player,
                        jersey_number: jersNumber,
                      })
                    );
                  } else {
                    setJerseyNumber(0);
                    setErrorMessages(['Trikotnummer muss eine Zahl sein.']);
                  }
                }}
              />
            </div>
          </div>
          {player.validationError && (
            <div className='row text-bg-danger'>
              <div className='col-4'>Achtung:</div>
              <div className='col-8'>{player.validationError}</div>
            </div>
          )}
          {errorMessages.length > 0 && (
            <div className='row text-bg-danger'>
              <div className='col-4'>Fehler:</div>
              <div className='col-8'>
                {errorMessages.map((errorMessage: string, index: number) => (
                  <div key={index}>
                    {errorMessage}
                    <br />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className='row'>
            <div className='col'>
              {showSuccessMessage && (
                <>
                  {player.isSelected && (
                    <Alert variant='success'>Person wurde hinzugefügt.</Alert>
                  )}
                  {!player.isSelected && (
                    <Alert variant='success'>Person wurde entfernt.</Alert>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className='modal-footer'>
          <Button
            variant='secondary'
            className='modal-button-left me-auto'
            disabled={showSuccessMessage}
            onClick={() => {
              nextPlayer(-1);
              setErrorMessages([]);
            }}
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
                  disabled={showSuccessMessage}
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
                  disabled={showSuccessMessage}
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
              disabled={showSuccessMessage}
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
            disabled={showSuccessMessage}
            onClick={() => {
              nextPlayer(1);
              setErrorMessages([]);
            }}
          >
            <i className='bi bi-arrow-right'></i>
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PlayerModal;
