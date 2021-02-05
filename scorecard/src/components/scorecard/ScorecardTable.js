import React from 'react';
import PropTypes from 'prop-types';

const ScorecardTable = ({entries}) => {
  return (
    <div>
      <table className='table table-striped'>
        <thead>
          <tr>
            <th>Pkt:</th>
            <th>6</th>
            <th>2</th>
            <th>1</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td style={{fontSize: 'smaller'}}>{entry.number}</td>
              <td>{entry.sixPoints}</td>
              <td>{entry.twoPoints}</td>
              <td>{entry.onePoint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ScorecardTable.propTypes = {
  entries: PropTypes.array.isRequired,
};

export default ScorecardTable;
