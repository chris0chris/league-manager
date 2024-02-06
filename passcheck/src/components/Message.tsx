import React from 'react';
import useMessage from '../hooks/useMessage';
import {Alert} from 'react-bootstrap';

const Message: React.FC = () => {
  const {message} = useMessage();
  return (
    <>
      {message.text && (
        <Alert variant={message.color ?? 'danger'}>{message.text}</Alert>
      )}
    </>
  );
};

export default Message;
