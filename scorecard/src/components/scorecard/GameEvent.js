import React from 'react';
import PropTypes from 'prop-types';

const GameEvent = ({update}) => {
  update({Turnover: true});
  return (
    <div className="row">
      <div className="text-center">
      Angriffswechsel? Bitte speichern klicken.</div>
    </div>
  );
};

GameEvent.propTypes = {
  update: PropTypes.func.isRequired,
};

export default GameEvent;
