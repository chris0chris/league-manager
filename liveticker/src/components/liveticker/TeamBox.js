import React from 'react';
import PropTypes from 'prop-types';

const TeamBox = (props) => {
  const {img, name} = props;
  return (
    <div className='col-4 text-center align-self-center fs-6'>
      {img && (
        <>
          <img src={img} width='50px' height='50px' className='img-thumbnail' />
          <br />
        </>
      )}
      <span className=''>{name}</span>
    </div>
  );
};

TeamBox.propTypes = {
  img: PropTypes.string,
  name: PropTypes.string,
};

export default TeamBox;
