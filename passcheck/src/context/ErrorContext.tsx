import {createContext} from 'react';

// Define a context for error handling
const ErrorContext = createContext<{
  error: Error | null;
  setError: (error: Error | null) => void;
}>({
  error: null,
  setError: (value) => {
    console.log('setError in ErrorContext', value);
  },
});

export default ErrorContext;
