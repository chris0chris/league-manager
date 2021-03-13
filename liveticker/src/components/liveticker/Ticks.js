import React from 'react';
import PropTypes from 'prop-types';

const Ticks = (props) => {
  const { entries } = props;
  return (
    <ul className="list-group list-group-flush">
      {entries.map((entry, index) => (
        <li key={index} className={`list-group-item`}>
          <div className="text-center text-muted smaller">{entry.time} Uhr</div>
          <div className={entry.isHome ? '' : 'text-end'}>{entry.text}</div>
        </li>
      ))}
    </ul>
  );
};

Ticks.propTypes = {};

export default Ticks;
