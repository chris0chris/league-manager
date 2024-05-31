import React, { useEffect, useState } from "react";
import useNotification from "../hooks/useNotification";
import { Toast, ToastContainer } from "react-bootstrap";

const Notification: React.FC = () => {
  const { notification } = useNotification();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (notification.text) {
      setShow(true);
    }
  }, [notification.text]);

  return (
    <>
      <ToastContainer position="bottom-center" className="mb-2">
        <Toast
          onClose={() => {
            setShow(false);
            notification.text = "";
          }}
          show={show}
          delay={notification.isError ? 10000 : 3000}
          autohide
        >
          <Toast.Header
            className={`bg-${notification.color} text-white fw-bold`}
            closeVariant="white"
          >
            {notification.isError && (
              <span className="me-auto">
                <i className="bi bi-fire me-2"></i>Fehler
              </span>
            )}
            {!notification.isError && (
              <span className="me-auto">
                <i className="bi bi-info-circle me-1"></i>nformation
              </span>
            )}
          </Toast.Header>
          <Toast.Body>{notification.text}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default Notification;
