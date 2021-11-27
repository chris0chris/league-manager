import React from 'react';
import PropTypes from 'prop-types';
import {FaInfinity} from 'react-icons/fa';
import {GiCancel} from 'react-icons/gi';

const DisplayAllTicks = (props) => {
  const {loadAllTicks, setLoadAllTicks} = props;
  return (
    <div onClick={() => setLoadAllTicks(!loadAllTicks)}>
      { loadAllTicks &&
        <GiCancel title="Click to display only last 5 entries" />
      }
      {!loadAllTicks &&
      <>
        <FaInfinity title="Click to display all entries" /><br/>
      </>
      }

    </div>
  );
};

DisplayAllTicks.propTypes = {

};

export default DisplayAllTicks;