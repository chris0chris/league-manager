import PropTypes from "prop-types";
import React from "react";

const RadioButtons = ({ name, buttonInfos }) => {
  return (
    <div className="row mt-3">
      {buttonInfos.map((buttonInfo, index) => (
        <div key={index} className="col d-grid">
          <input
            type="radio"
            className="btn-check"
            name={name}
            id={buttonInfo.id}
            autoComplete="off"
            required
          />
          <label className="btn btn-outline-secondary" htmlFor={buttonInfo.id}>
            {buttonInfo.text}
          </label>
        </div>
      ))}
    </div>
  );
};

RadioButtons.propTypes = {
  name: PropTypes.string.isRequired,
  buttonInfos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.isRequired,
    })
  ).isRequired,
};

export default RadioButtons;
