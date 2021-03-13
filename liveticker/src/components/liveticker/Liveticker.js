import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getLiveticker } from '../../actions/liveticker';
import { apiGet } from '../../actions/utils/api';

import GameTicker from './GameTicker';

jest.mock('../../actions/utils/api');
apiGet.mockImplementation(() => {
  return () => {};
});

const Liveticker = (props) => {
  useEffect(() => {
    props.getLiveticker();
  }, []);
  console.log(props.liveticker);
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
