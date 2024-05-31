import { ReactNode, useState } from "react";
import MessageContext, {
  Message,
  MessageColor,
} from "../context/MessageContext";

interface ErrorProviderProps {
  children: ReactNode;
}

const MessageProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [message, setMessage] = useState<Message>({
    text: "",
    color: MessageColor.Danger,
  });

  return (
    <MessageContext.Provider value={{ message, setMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageProvider;
