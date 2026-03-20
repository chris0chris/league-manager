import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

const FloatingInput = (props) => {
  const {
    id,
    text,
    value,
    show = true,
    required = true,
    readOnly = false,
    onChange: setValue,
    autofocus = false,
    type = 'text',
    setHasFocus = () => {}} = props;
  const [inputValue, setInputValue] = useState(value);
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  const handleChange = (newValue) => {
    setInputValue(newValue);
    setValue(newValue);
  };
  return (
    <div className="form-floating mt-3">
      <input
        autoFocus={autofocus}
        type={type}
        className="form-control"
        id={id}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          setHasFocus(false);
        }}
        onFocus={() => {
          setHasFocus(true);
        }}
        placeholder={text}
        required={required}
        readOnly={readOnly}
        style={{display: show ? 'block' : 'none'}}
      />
      <label htmlFor={id} className="form-label">
        {text}
      </label>
    </div>
  );
};

FloatingInput.propTypes = {
  id: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  onChange: PropTypes.func.isRequired,
  show: PropTypes.bool,
  required: PropTypes.bool,
  readOnly: PropTypes.bool,
  setHasFocus: PropTypes.func,
  autofocus: PropTypes.bool,
  type: PropTypes.string,
};

export default FloatingInput;
