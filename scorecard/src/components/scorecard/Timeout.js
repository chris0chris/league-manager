import React from 'react';
import PropTypes from 'prop-types';
import {FaStopwatch} from 'react-icons/fa';

const Timeout = (props) => {
  return (
    <div>
      <button type='button' className='btn btn-secondary'>
        <FaStopwatch />
      </button>
    </div>
  );
};

Timeout.propTypes = {

};

export default Timeout;
