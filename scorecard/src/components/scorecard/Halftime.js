import React from 'react';
import PropTypes from 'prop-types';
import Timeout from './Timeout';

const Halftime = (props) => {
  return (
    <div className='row mt-2'>
      <div className='col-2'>
        <Timeout modId="1" />
      </div>
      <div className='col-2'>
        <Timeout modId="2" />
      </div>
      <div className='col-4 d-grid'>
        <button type='button' className='btn btn-primary'>
            Halbzeit
        </button>
      </div>
      <div className='col-2'>
        <Timeout modId="3" />
      </div>
      <div className='col-2'>
        <Timeout modId="4" />
      </div>
    </div>
  );
};

Halftime.propTypes = {

};

export default Halftime;
