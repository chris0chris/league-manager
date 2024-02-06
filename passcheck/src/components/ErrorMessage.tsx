import React from 'react';
import useError from '../hooks/useError';
import {Alert} from 'react-bootstrap';

const ErrorMessage: React.FC = () => {
  const {error} = useError();
  return <>{error && <Alert variant='danger'>{error?.message}</Alert>}</>;
};

export default ErrorMessage;
