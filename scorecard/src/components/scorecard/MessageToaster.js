import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {FaCheck} from 'react-icons/fa';
import {connect} from 'react-redux';
import MessageToasterContent from './MessageToasterContent';

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
  const closeToast = () => {
    setShowToast(false);
    setTimerIsOn(false);
  };
  const [showToast, setShowToast] = useState(true);
  return (
    <div className="container">
      {props.status != null &&
      <div className="position-fixed bottom-0 start-50 translate-middle-x mb-2"
        style={{zIndex: 10000}}>
        <div className={`toast ${showToast ? 'show' : 'hide'}`}
          role="alert" aria-live="assertive" aria-atomic="true">
          {(() => {
            switch (props.status) {
              case 200:
                return <MessageToasterContent
                  content={<>Eintrag gespeichert <FaCheck /></>}
                  type="success"
                  onClick={closeToast}/>;
              case 404:
                return <MessageToasterContent
                  content={JSON.stringify(props.msg)}
                  type="warning"
                  onClick={closeToast} />;
              default:
                return <MessageToasterContent
                  content={JSON.stringify(props.msg)}
                  type="danger" isError={true}
                  onClick={closeToast}/>;
            }
          })()}
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
