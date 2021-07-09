/* eslint-disable max-len */
import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery/src/jquery';
import {connect} from 'react-redux';

const ScorecardTable = (props) => {
  const {entries, delay = 250} = props;
  const [click, setClick] = useState({count: 0, event: null});
  useEffect(() => {
    const timer = setTimeout(() => {
      // simple click
      if (click.count === 1) handleClick(click.event);
      setClick({count: 0, event: null});
    }, delay);

    // the duration between this click and the previous one
    // is less than the value of delay = double-click
    if (click.count === 2) handleDoubleClick(click.event);

    return () => clearTimeout(timer);
  }, [click.count]);
  const handleDoubleClick = (ev) => {
    const entryToDelete = {
      ...entries[ev.target.parentNode.dataset.index],
      __html: ev.target.parentNode.innerHTML,
    };
    if (entryToDelete.isDeleted) {
      // do nothing, because entry is alreay deleted
      return;
    }
    props.dispatch({
      type: 'DELETE_ENTRY',
      payload: entryToDelete,
    });
    $(`#modalDeleteEntry`).modal('show');
  };
  const handleClick = (ev) => {
  };
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
      htmlSnippet = <td colSpan='3' className='text-center'>{entry.name}</td>;
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
            <tr key={index}
              data-index={`${index}`}
              className={entry.isDeleted?'text-decoration-line-through':''}
              onClick={(ev) => {
                setClick((prev) => {
                  return {count: (prev.count + 1), event: ev};
                });
              }}>
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
  delay: PropTypes.number,
  dispatch: PropTypes.func.isRequired,
};

export default connect()(ScorecardTable);
