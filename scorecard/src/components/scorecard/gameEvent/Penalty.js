import React, {useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {FaTrashAlt} from 'react-icons/fa';

const Penalty = (props) => {
  const {update} = props;
  const [searchInput, setSearchInput] = useState('');
  const [displaySuggestionBox, setDisplaySuggestionBox] = useState(true);
  const [displaySearchInput, setDisplaySearchInput] = useState(true);
  const [selectedPenalty, setSelectedPenalty] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const searchInputElement = useRef({
    setCustomValidity: 'Bitte auf eine Strafe tippen!',
  });
  const PENALTY_DATA = [
    {name: 'illegaler Kontakt'},
    {name: 'Offense Pass Behinderung'},
    {name: 'Fehlstart'},
    {name: 'Defense Offside'},
    {name: 'illegale Ballübergabe'},
  ];
  const handleSearchSelection = (text) => {
    setSearchInput('');
    setSelectedPenalty(text);
    setDisplaySuggestionBox(false);
    setDisplaySearchInput(false);
    searchInputElement.current.setCustomValidity('');
    searchInputElement.current.removeAttribute('required');
  };
  const handleSearchInput = (input) => {
    if (!selectedPenalty) {
      console.log(searchInputElement.current);
      searchInputElement.current.setCustomValidity(
        'Bitte auf eine Strafe tippen!'
      );
    }
    setSearchInput(input);
  };
  const clearSearchInput = () => {
    setDisplaySearchInput(true);
    setDisplaySuggestionBox(true);
    setSelectedPenalty('');
    searchInputElement.current.setCustomValidity(
      'Bitte auf eine Strafe tippen!'
    );
  };
  const checkName = (item) => {
    const pattern = searchInput
      .split('')
      .map((character) => `${character}.*`)
      .join('');
    const regex = new RegExp(pattern, 'gi');
    return item.name.match(regex);
  };
  update({
    event: [{name: 'Strafe', player: playerNumber, input: selectedPenalty}],
  });
  const filteredItems = PENALTY_DATA.filter((item) => {
    return checkName(item, searchInput);
  });

  const itemsToDisplay = searchInput ? filteredItems : PENALTY_DATA;
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
        <div className='row mt-2'>
          <div className='col'>
            <input
              className='form-control'
              placeholder='Ausgewählte Strafe'
              value={selectedPenalty}
              readOnly
              aria-invalid='true'
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
        <input
          className='form-control mt-1'
          placeholder='Strafe eingeben und auswählen...'
          value={searchInput}
          onChange={(ev) => {
            handleSearchInput(ev.target.innerText);
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
              onClick={(ev) => handleSearchSelection(ev.target.innerText)}
            >
              {option.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

Penalty.propTypes = {};

export default Penalty;
