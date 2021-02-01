import React from "react";

const FloatingInput = ({ id, text }) => {
  return (
    <div className="form-floating mt-3">
      <input
        type="text"
        className="form-control"
        id={id}
        placeholder={text}
        required
      />
      <label htmlFor={id} className="form-label">
        {text}
      </label>
    </div>
  );
};

export default FloatingInput;
