import {createContext} from 'react';

export enum MessageColor {
  Primary = 'primary',
  Secondary = 'secondary',
  Success = 'success',
  Danger = 'danger',
  Warning = 'warning',
  Info = 'info',
  Light = 'light',
  Dark = 'dark',
}

export interface Message {
  text: string;
  color?: MessageColor;
}

const MessageContext = createContext<{
  message: Message;
  setMessage: (messge: Message) => void;
}>({
  message: {text: ''},
  setMessage: (value: Message) => {},
});

export default MessageContext;
