import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

const Timer = ({isOn: timerIsOn, durationInSeconds}) => {
  const [duration, setDuration] = useState(durationInSeconds);
  const timer = () => setDuration(duration - 1);
  console.log(duration);
  useEffect(() => {
    if (timerIsOn) {
      const id = setInterval(timer, 1000);
      return () => clearInterval(id);
    } else {
      setDuration(durationInSeconds);
    }
  }, [duration, timerIsOn]);
  return (<>
    <div className="row">
      <div className="text-center">
                verbleibende Spielzeitunterbrechung:</div>
    </div>
    <div className="row text-center">
      <div className="text-center timer">
        {duration}
      </div>
      <div className="text-center sub-timer">
        Sekunden
      </div>
    </div></>
  );
};

Timer.propTypes = {
  isOn: PropTypes.bool.isRequired,
  durationInSeconds: PropTypes.number.isRequired,
};

export default Timer;
