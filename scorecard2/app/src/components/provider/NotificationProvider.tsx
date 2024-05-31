import { ReactNode, useState } from "react";
import NotificationContext, {
  Notification,
  NotificationColor,
} from "../../context/NotificationContext";

interface ErrorProviderProps {
  children: ReactNode;
}

const NotificationProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [notification, setNotificationState] = useState<Notification>({
    text: "",
    color: NotificationColor.Danger,
    isError: true,
  });

  const setNotification = (newNotification: Partial<Notification>) => {
    const defaultNotification: Notification = {
      text: "",
      color: NotificationColor.Danger,
      isError: true,
    };

    setNotificationState({ ...defaultNotification, ...newNotification });
  };

  return (
    <NotificationContext.Provider value={{ notification, setNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
