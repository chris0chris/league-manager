/* eslint-disable max-len */
import React from 'react';
import {Navigate} from 'react-router-dom';
import {SELECT_GAME_URL} from '../common/urls';
import {useEffect, useState} from 'react';

const SelectPasscheckOrScorecard = () => {
  const [redirectToScorecard, setRedirectToScorecard] = useState(false);

  useEffect(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  };
}, []);

  const redirectToPasscheck = () => {
    window.location.href = '/passcheck';
  };
  if (redirectToScorecard) {
    console.log('navigating to ', SELECT_GAME_URL);
    return <Navigate to={SELECT_GAME_URL} />;
  }
  return (
    <div className='select-container d-flex align-items-center justify-content-center'>
      <button
        className='btn btn-primary btn-lg m-2'
        onClick={redirectToPasscheck}
      >
        Passcheck
      </button>
      <button
        className='btn btn-secondary btn-lg m-2'
        onClick={() => setRedirectToScorecard(true)}
      >
        Scorecard
      </button>
    </div>
  );
};
SelectPasscheckOrScorecard.propTypes = {};

export default SelectPasscheckOrScorecard;
