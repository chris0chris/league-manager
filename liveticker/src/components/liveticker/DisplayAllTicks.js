import React from 'react';
import PropTypes from 'prop-types';
import {FaInfinity} from 'react-icons/fa';
import {GiCancel} from 'react-icons/gi';

const DisplayAllTicks = (props) => {
  const {loadAllTicks, setLoadAllTicks} = props;
  return (
    <div onClick={() => setLoadAllTicks(!loadAllTicks)}>
      { loadAllTicks &&
        <GiCancel title="Klicken, um die letzten 5 Einträge anzuzeigen" />
      }
      {!loadAllTicks &&
      <>
        <FaInfinity title="Klicken, um alle Einträge anzuzeigen" /><br/>
      </>
      }

    </div>
  );
};

DisplayAllTicks.propTypes = {

};

export default DisplayAllTicks;
