import React from 'react';
import PropTypes from 'prop-types';

const ScorecardTable = ({entries}) => {
  const handleEntryDisplay = (entry) => {
    let htmlSnippet = null;
    if (entry.hasOwnProperty('td')) {
      let pat2 = '';
      let pat1 = '';
      if (entry.hasOwnProperty('pat2')) {
        pat2 = entry.pat2 ? '#' + entry.pat2 : '-';
      }
      if (entry.hasOwnProperty('pat1')) {
        pat1 = entry.pat1 ? '#' + entry.pat1 : '-';
      }
      htmlSnippet = <>
        <td>{'#' + entry.td }</td>
        <td>{pat2}</td>
        <td>{pat1}</td>
      </>;
    } else if (entry.cop) {
      // eslint-disable-next-line max-len
      htmlSnippet = <td colSpan='3' className='text-center'>Turnover</td>;
    } else {
      const keyValues = Object.entries(entry);
      const event = keyValues[1][0];
      const player = keyValues[1][1] ? keyValues[1][1] : '';
      // eslint-disable-next-line max-len
      htmlSnippet = <td colSpan="3" className='text-center'>{event}{player ? ` (#${player})` : ''}</td>;
    }
    return htmlSnippet;
  };
  return (
    <div>
      <table className='table table-sm table-striped text-center'>
        <thead>
          <tr>
            <th>Pkt:</th>
            <th>6</th>
            <th>2</th>
            <th>1</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <td style={{fontSize: 'smaller'}}>{entry.sequence}</td>
              {handleEntryDisplay(entry)}
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
