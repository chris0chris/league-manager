/* eslint-disable max-len */
import React, {useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {FaTrashAlt} from 'react-icons/fa';
import {connect} from 'react-redux';
import {getPenalties} from '../../../actions/config';

const Penalty = (props) => {
  const LIMIT_DISPLAYED_PENALTIES = 5;
  const {update} = props;
  const [searchInput, setSearchInput] = useState('');
  const [displaySuggestionBox, setDisplaySuggestionBox] = useState(true);
  const [displaySearchInput, setDisplaySearchInput] = useState(true);
  const [selectedPenalty, setSelectedPenalty] = useState('');
  const [isPenaltyAgainstOpponent, setIsPenaltyAgainstOpponent] = useState(false);
  const [playerNumber, setPlayerNumber] = useState('');
  const searchInputElement = useRef();
  const handleSearchSelection = (text, isPenaltyAgainstOpp) => {
    setSearchInput('');
    setSelectedPenalty(text);
    setIsPenaltyAgainstOpponent(isPenaltyAgainstOpp);
    setDisplaySuggestionBox(false);
    setDisplaySearchInput(false);
    searchInputElement.current.setCustomValidity('');
    searchInputElement.current.removeAttribute('required');
  };
  const handleSearchInput = (input) => {
    if (!selectedPenalty) {
      searchInputElement.current.setCustomValidity(
          'Bitte auf eine Strafe tippen!',
      );
    }
    setSearchInput(input);
  };
  const clearSearchInput = () => {
    setDisplaySearchInput(true);
    setDisplaySuggestionBox(true);
    setSelectedPenalty('');
    searchInputElement.current.setCustomValidity(
        'Bitte auf eine Strafe tippen!',
    );
  };
  const checkName = (item, input) => {
    const pattern = input
        .split('')
        .map((character) => `${character}.*`)
        .join('');
    const regex = new RegExp(pattern, 'gi');
    return item.name.match(regex);
  };
  const filteredItems = props.penalties.filter((item) => {
    return checkName(item, searchInput);
  });
  let itemsToDisplay = searchInput ? filteredItems : props.penalties;
  itemsToDisplay = itemsToDisplay.slice(0, LIMIT_DISPLAYED_PENALTIES);
  update({
    event: [{name: 'Strafe', player: playerNumber, input: selectedPenalty}],
  }, isPenaltyAgainstOpponent);
  return (
    <div>
      <div className='mt-2' style={{position: 'relative'}}>
        <div className='input-group'>
          <div className='input-group-text' id='penaltyGroup'>
            #
          </div>
          <input
            type='number'
            className='form-control'
            placeholder='Trikotnummer'
            aria-label='number'
            aria-describedby='penaltyGroup'
            onChange={(ev) => setPlayerNumber(ev.target.value)}
            required
            value={playerNumber}
          />
        </div>
        {!displaySearchInput && (
          <div className='row mt-2'>
            <div className='col'>
              <input
                className='form-control'
                placeholder='Ausgewählte Strafe'
                value={selectedPenalty || ''}
                readOnly
              />
            </div>
            <div className='col-3 d-grid'>
              <button
                type='reset'
                className='btn btn-danger'
                onClick={clearSearchInput}
              >
                <FaTrashAlt />
              </button>
            </div>
          </div>
        )}
        <input
          type='text'
          className='form-control mt-1'
          placeholder='Strafe eingeben und auswählen...'
          value={searchInput}
          onChange={(ev) => {
            handleSearchInput(ev.target.value);
          }}
          ref={searchInputElement}
          required
          style={{display: displaySearchInput ? 'block' : 'none'}}
        />
        <ul
          className='list-group'
          style={{
            position: 'absolute',
            zIndex: 99,
            width: '100%',
            display: displaySuggestionBox ? 'block' : 'none',
          }}
        >
          {itemsToDisplay.map((option, index) => (
            <li
              key={index}
              className='list-group-item'
              onClick={() => {
                handleSearchSelection(option.name, option.isPenaltyAgainstOpponent);
              }}
            >
              <div className='row'>
                <div className='col-9'>{option.name}</div>
                <div
                  className='col-3 text-end text-muted ps-0 pe-0'
                  style={{fontSize: 'x-small'}}
                >
                  {option.subtext}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

Penalty.propTypes = {
  penalties: PropTypes.array.isRequired,
  update: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  penalties: state.configReducer.penalties,
});

export default connect(mapStateToProps, {getPenalties})(Penalty);
