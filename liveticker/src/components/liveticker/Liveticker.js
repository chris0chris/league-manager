import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {getLiveticker} from '../../actions/liveticker';

import GameTicker from './GameTicker';

const Liveticker = (props) => {
  const [endlessCounter, setEndlessCounter] = useState(0);
  const timer = () => setEndlessCounter(endlessCounter + 1);
  const minute = 60 * 1000;
  const refreshTime = 0.5 * minute;
  useEffect(() => {
    props.getLiveticker();
    const id = setInterval(timer, refreshTime);
    return () => clearInterval(id);
  }, [endlessCounter]);
  return (
    <>
      {props.liveticker.length == 0 &&
        <div>Aktuell finden keine Spiele statt.</div>
      }
      {props.liveticker.map((teamEntry, index) => (
        <GameTicker {...teamEntry} key={index} />
      ))}
    </>
  );
};

Liveticker.propTypes = {
  liveticker: PropTypes.array.isRequired,
  getLiveticker: PropTypes.func.isRequired,
};
const mapStateToProps = (state) => ({
  liveticker: state.livetickerReducer.liveticker,
});

export default connect(mapStateToProps, {getLiveticker})(Liveticker);
