/* eslint-disable max-len */
import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {getLiveticker} from '../../actions/liveticker';

import GameTicker from './GameTicker';

const Liveticker = (props) => {
  const [endlessCounter, setEndlessCounter] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [gamesToDisplayAllTicks, setGamesToDisplayAllTicks] = useState([]);
  const timer = () => setEndlessCounter(endlessCounter + 1);
  const minute = 60 * 1000;
  const refreshTime = 0.5 * minute;
  useEffect(() => {
    updateLiveticker();
    const id = setInterval(timer, refreshTime);
    return () => clearInterval(id);
  }, [endlessCounter]);
  const updateGamesToDisplay = (gameIndex, addGame) => {
    if (addGame) {
      gamesToDisplayAllTicks.push(gameIndex);
    } else {
      const index = gamesToDisplayAllTicks.indexOf(gameIndex);
      if (index > -1) {
        gamesToDisplayAllTicks.splice(index, 1);
      }
    }
    updateLiveticker();
  };
  const updateLiveticker = () => {
    const gameIds = [];
    gamesToDisplayAllTicks.forEach((index) => {
      gameIds.push(props.liveticker[index].gameId);
    });
    props.getLiveticker(gameIds);
  };
  return (
    <>
      {props.liveticker.length == 0 &&
        <div>There are currently no games.</div>
      }
      {props.liveticker.map((teamEntry, index) => {
        return (
          <GameTicker {...teamEntry} gameIndex={index} key={index} updateGamesToDisplay={updateGamesToDisplay} />
        );
      })}
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