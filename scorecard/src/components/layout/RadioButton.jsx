import PropTypes from 'prop-types';
import React from 'react';

 
const RadioButton = ({id, name, onChange: setValue, text, value, color = 'primary', checked=false}) => {
  return (
    <div className="col d-grid">
      <input
        type="radio"
        className="btn-check"
        name={name}
        id={id}
        autoComplete="off"
        defaultValue={value ? value : text}
        onChange={(ev) => setValue(ev.target.value)}
        checked={checked}
        required
        data-testid={value ? value : text}
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
