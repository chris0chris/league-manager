import {useContext} from 'react';
import MessageContext from '../context/MessageContext';

const useMessage = () => {
  const {message, setMessage} = useContext(MessageContext);
  return {message, setMessage};
};

export default useMessage;
