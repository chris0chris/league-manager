import { ReactNode, useState } from 'react';
import ErrorContext from '../context/ErrorContext';
import useError from '../hooks/useError';

interface ErrorProviderProps {
  children: ReactNode;
}

const ErrorProvider: React.FC<ErrorProviderProps> = ({children}) => {
  const [error, setError] = useState<Error | null>(null)

  return (
    <ErrorContext.Provider value={{error, setError}}>
      {children}
    </ErrorContext.Provider>
  );
};

export default ErrorProvider;
