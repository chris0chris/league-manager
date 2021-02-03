import PropTypes from "prop-types";
import React from "react";

const RadioButton = ({ id, name, onChange: setValue, text, value }) => {
  const handleChange = (value) => {
    setValue(value);
  };
  return (
    <div className="col d-grid">
      <input
        type="radio"
        className="btn-check"
        name={name}
        id={id}
        autoComplete="off"
        defaultValue={value ? value : text}
        onChange={(ev) => handleChange(ev.target.value)}
        required
      />
      <label className="btn btn-outline-secondary" htmlFor={id}>
        {text}
      </label>
    </div>
  );
};

RadioButton.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  text: PropTypes.any.isRequired,
  value: PropTypes.string,
};

export default RadioButton;
