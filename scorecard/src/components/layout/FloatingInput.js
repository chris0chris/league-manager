import React, {useState} from 'react';
import PropTypes from 'prop-types';

const FloatingInput = ({id, text, value, onChange: setValue}) => {
  const [inputValue, setInputValue] = useState(value.name);
  const handleChange = (newValue) => {
    setInputValue(newValue);
    setValue({...value, name: newValue});
  };
  return (
    <div className="form-floating mt-3">
      <input
        type="text"
        className="form-control"
        id={id}
        defaultValue={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={text}
        required
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
};

export default FloatingInput;
