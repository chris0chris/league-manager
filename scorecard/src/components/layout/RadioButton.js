import PropTypes from 'prop-types';
import React from 'react';

// eslint-disable-next-line max-len
const RadioButton = ({id, name, onChange: setValue, text, value, color = 'secondary', checked = false}) => {
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
        defaultChecked={checked ? true : false}
        required
      />
      <label className={`btn btn-outline-${color}`} htmlFor={id}>
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
  color: PropTypes.string,
  checked: PropTypes.bool,
};

export default RadioButton;
