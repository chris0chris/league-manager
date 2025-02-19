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

export type Message = {
  text: string;
  color?: MessageColor;
};

const MessageContext = createContext<{
  message: Message;
  setMessage: (message: Message) => void;
}>({
  message: {text: ''},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMessage: (value: Message) => {},
});

export default MessageContext;
