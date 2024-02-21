/* eslint-disable max-len */
import PropTypes from 'prop-types';
import React from 'react';
import {Navigate} from 'react-router-dom';
import {SELECT_GAME_URL} from '../common/urls';
import {useEffect, useState} from 'react';
import {connect} from 'react-redux';
import {getPasscheckStatus} from '../../actions/passcheck';

const SelectPasscheckOrScorecard = ({
  isPasscheckStatusCompleted,
  getPasscheckStatus,
}) => {
  const [redirectToScorecard, setRedirectToScorecard] = useState(false);

  useEffect(() => {
    getPasscheckStatus();
  }, [isPasscheckStatusCompleted]);

  useEffect(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.addEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const redirectToPasscheck = () => {
    window.location.href = '/passcheck';
  };
  if (redirectToScorecard || isPasscheckStatusCompleted) {
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
SelectPasscheckOrScorecard.propTypes = {
  getPasscheckStatus: PropTypes.func.isRequired,
  isPasscheckStatusCompleted: PropTypes.bool.isRequired,
};

const mapStateToProps = (state) => ({
  isPasscheckStatusCompleted: state.passcheckReducer.completed,
});

export default connect(mapStateToProps, {getPasscheckStatus})(
  SelectPasscheckOrScorecard
);
