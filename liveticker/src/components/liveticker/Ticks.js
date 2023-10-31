/* eslint-disable max-len */
import React from 'react';
import PropTypes from 'prop-types';

const Ticks = (props) => {
  const {entries, gameStatus} = props;
  const getAlignmentFor = (team) => {
    switch (team) {
      case 'home':
        return '';
      case 'away':
        return 'text-end';
      default:
        return 'text-center';
    }
  };
  return (
    <ul className='list-group list-group-flush'>
      {gameStatus === 'beendet' && (
        <li className={`list-group-item`}>
          <div className='text-center'>Spiel ist bereits beendet.</div>
        </li>
      )}
      {gameStatus !== 'beendet' && (
        <>
          {entries.length === 0 && (
            <li className={`list-group-item`}>
              <div className='text-center'>
                Keine Einträge bisher vorhanden.
              </div>
            </li>
          )}
          {entries.map((entry, index) => (
            <li key={index} className={`list-group-item`}>
              <div className='text-center text-muted smaller'>
                {entry.time} Uhr
              </div>
              <div className={getAlignmentFor(entry.team)}>{entry.text}</div>
            </li>
          ))}
        </>
      )}
    </ul>
  );
};

Ticks.propTypes = {
  entries: PropTypes.array.isRequired,
  gameStatus: PropTypes.string.isRequired,
};

export default Ticks;
