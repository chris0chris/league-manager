import PropTypes from "prop-types";
import React from "react";

const RadioButtons = ({ name, buttonInfos, onChange: setValue }) => {
  const handleChange = (value) => {
    setValue(value);
  };
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
            value={buttonInfo.value ? buttonInfo.value : buttonInfo.text}
            onChange={(ev) => handleChange(ev.target.value)}
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
  onChange: PropTypes.func.isRequired,
  buttonInfos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.isRequired,
      value: PropTypes.string,
    })
  ).isRequired,
};

export default RadioButtons;
