import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getLiveticker } from '../../actions/liveticker';

import GameTicker from './GameTicker';

const Liveticker = (props) => {
  useEffect(() => {
    props.getLiveticker();
  }, []);
  return (
    <>
      {props.liveticker.map((teamEntry, index) => (
        <GameTicker {...teamEntry} key={index} />
      ))}
    </>
  );
};

Liveticker.propTypes = {};
const mapStateToProps = (state) => ({
  liveticker: state.livetickerReducer.liveticker,
});

export default connect(mapStateToProps, { getLiveticker })(Liveticker);
