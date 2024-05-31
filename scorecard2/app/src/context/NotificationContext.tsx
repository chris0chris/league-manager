import { createContext } from "react";

export enum NotificationColor {
  Primary = "primary",
  Secondary = "secondary",
  Success = "success",
  Danger = "danger",
  Warning = "warning",
  Info = "info",
  Light = "light",
  Dark = "dark",
}

export type Notification = {
  text: string;
  color?: NotificationColor;
  isError?: boolean;
};

const NotificationContext = createContext<{
  notification: Notification;
  setNotification: (notification: Notification) => void;
}>({
  notification: { text: "" },
  setNotification: (value: Notification) => {},
});

export default NotificationContext;
