import React from 'react';
import PropTypes from 'prop-types';
import {FaInfo, FaUserInjured} from 'react-icons/fa';

const MessageToasterContent = (props) => {
  return (
    <>
      <div className={`toast-header text-white bg-${props.type}`}>
        { props.isError &&
        <>
          <FaUserInjured className="me-2"/>
          <strong className="me-auto">Fehler</strong>
        </>

        }
        { !props.isError &&
        <>
          <FaInfo />
          <strong className="me-auto">nformation</strong>
        </>
        }
        <button type="button" className="btn-close" onClick={props.onClick} aria-label="Close"></button>
      </div>
      <div className="toast-body">
        {props.content}
      </div>
    </>
  );
};

MessageToasterContent.propTypes = {
  content: PropTypes.any.isRequired,
  type: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  isError: PropTypes.bool,
};

export default MessageToasterContent;
