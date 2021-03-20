import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {FaCheck, FaInfo, FaUserInjured} from 'react-icons/fa';
import {connect} from 'react-redux';

const MessageToaster = (props) => {
  const [duration, setDuration] = useState(3);
  const [timerIsOn, setTimerIsOn] = useState(false);
  const timer = () => setDuration(duration - 1);
  useEffect(() => {
    if (!timerIsOn || duration <= 0) {
      setDuration(3);
      setTimerIsOn(false);
      setShowToast(false);
    } else if (timerIsOn) {
      const id = setInterval(timer, 1000);
      return () => clearInterval(id);
    }
  }, [duration, timerIsOn]);
  useEffect(() => {
    if (props.status != null && props.status == 200) {
      setTimerIsOn(true);
      setDuration(3);
    } else {
      setTimerIsOn(true);
      setDuration(7);
    }
    setShowToast(true);
  }, [props.msg]);
  const [showToast, setShowToast] = useState(true);
  return (
    <div className="container">
      {props.status != null &&
      <div className="position-fixed bottom-0 start-50 translate-middle-x mb-2"
        style={{zIndex: 10000}}>
        <div className={`toast ${showToast ? 'show' : 'hide'}`}
          role="alert" aria-live="assertive" aria-atomic="true">
          {props.status == 200 &&
          <>
            <div className="toast-header bg-success text-white">
              <FaInfo />
              <strong className="me-auto">nformation</strong>
              <button type="button" className="btn-close" onClick={() => {
                setShowToast(!showToast); setTimerIsOn(false)
                ;
              }} aria-label="Close"></button>
            </div>
            <div className="toast-body">
              Eintrag gespeichert <FaCheck />
            </div>
          </>}
          {props.status != 200 &&
          <>
            <div className="toast-header bg-danger text-white">
              <FaUserInjured className="me-2"/>
              <strong className="me-auto">Fehler</strong>
              <button type="button" className="btn-close" onClick={() => {
                setShowToast(!showToast); setTimerIsOn(false)
                ;
              }} aria-label="Close"></button>
            </div>
            <div className="toast-body">
              {JSON.stringify(props.msg)}
            </div>
          </>}
        </div>
      </div>}
    </div>
  );
};

MessageToaster.propTypes = {
  msg: PropTypes.any.isRequired,
  status: PropTypes.number,
};

const mapStateToProps = (state) => ({
  msg: state.messageReducer.msg,
  status: state.messageReducer.status,
});


export default connect(mapStateToProps)(MessageToaster);
