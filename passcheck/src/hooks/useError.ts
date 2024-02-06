import {useContext} from 'react';
import ErrorContext from '../context/ErrorContext';

const useError = () => {
  const {error, setError} = useContext(ErrorContext);
  console.log('useError HOOK -> error:', error);
  // setError(new Error('useError()'));
  return {error, setError};
};

export default useError;
