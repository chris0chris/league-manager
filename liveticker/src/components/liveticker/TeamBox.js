import React from 'react';
import PropTypes from 'prop-types';
import {FaFootballBall} from 'react-icons/fa';


const TeamBox = (props) => {
  const {img, name, showPossession} = props;
  return (
    <div className='col-4 text-center align-self-center fs-6'>
      {img && (
        <>
          <img src={img} width='50px' height='50px' className='img-thumbnail' />
          <br />
        </>
      )}
      <span className=''>{name}</span><br/>
      { showPossession &&
        <FaFootballBall title='Team hat Ballbesitz' size='17' />
      }
    </div>
  );
};

TeamBox.propTypes = {
  img: PropTypes.string,
  name: PropTypes.string,
  showPossession: PropTypes.bool,
};

export default TeamBox;
