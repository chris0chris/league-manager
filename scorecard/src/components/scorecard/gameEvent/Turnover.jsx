import React from 'react';
import PropTypes from 'prop-types';

const Turnover = (props) => {
  const {update} = props;
  update({
    event: [
      {name: 'Turnover'},
    ],
  });
  return (
    <div className="row">
      <div className="mt-2 text-center">
      Angriffswechsel? Bitte speichern klicken.</div>
    </div>
  );
};

Turnover.propTypes = {
  update: PropTypes.func.isRequired,
};

export default Turnover;
