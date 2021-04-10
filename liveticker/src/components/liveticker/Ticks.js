/* eslint-disable max-len */
import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

const Ticks = (props) => {
  const {entries} = props;
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
      {entries.map((entry, index) => (
        <Fragment key={index}>
          { (entry.text != 'Ballabgabe') &&
          <li className={`list-group-item`}>
            <div className='text-center text-muted smaller'>{entry.time} Uhr</div>
            <div className={getAlignmentFor(entry.text.includes('Spielzeit') ? null : entry.team)}>{entry.text}</div>
          </li>
          }</Fragment>
      ))}
    </ul>
  );
};

Ticks.propTypes = {
  entries: PropTypes.array.isRequired,
};

export default Ticks;
