import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {FaCheck, FaInfo} from 'react-icons/fa';
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
    console.log('props.msg', props.msg);
    setShowToast(true),
    setTimerIsOn(true);
    setDuration(3);
  }, [props.msg]);
  const [showToast, setShowToast] = useState(true);
  console.log(props.status, props.status==200);
  return (
    <div className="container">
      <button type="button" className="btn btn-primary" id="liveToastBtn" onClick={() => {
        setShowToast(!showToast); setTimerIsOn(true);
      }}>Show live toast</button>
      {props.status != null &&
      <div className="position-fixed bottom-0 start-50 translate-middle-x mb-2" style={{zIndex: 10000}}>
        <div id="liveToast" className={`toast ${showToast ? 'show' : 'hide'}`} role="alert" aria-live="assertive" aria-atomic="true">
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
            </div></>
          }
          {props.status != 200 &&
          <div>Error!</div>
          }


        </div>
      </div>}
    </div>
  );
};

MessageToaster.propTypes = {

};

const mapStateToProps = (state) => ({
  msg: state.messageReducer.msg,
  status: state.messageReducer.status,
});


export default connect(mapStateToProps)(MessageToaster);
