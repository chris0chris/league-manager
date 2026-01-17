import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { Notification } from '../types/designer';

interface NotificationToastProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

/**
 * Component to display toast notifications.
 * Uses React Bootstrap's Toast and ToastContainer.
 * Positioned to avoid clipping by viewport boundaries.
 */
const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onClose }) => {
  return (
    <ToastContainer 
      position="bottom-end" 
      className="p-3" 
      style={{ zIndex: 10000 }}
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          show={notification.show}
          onClose={() => onClose(notification.id)}
          delay={5000}
          autohide={notification.type !== 'danger'}
          bg={notification.type}
        >
          <Toast.Header closeButton={true}>
            <i className={`bi bi-${notification.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
            <strong className="me-auto">
              {notification.title || (notification.type === 'danger' ? 'Error' : 'Notification')}
            </strong>
          </Toast.Header>
          <Toast.Body className={notification.type !== 'info' && notification.type !== 'warning' ? 'text-white' : ''}>
            <div className="d-flex justify-content-between align-items-center">
              <span>{notification.message}</span>
              {notification.undoAction && (
                <button 
                  className={`btn btn-sm ms-2 ${notification.type === 'success' || notification.type === 'danger' ? 'btn-light' : 'btn-outline-dark'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    notification.undoAction?.();
                    onClose(notification.id);
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Undo
                </button>
              )}
            </div>
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default NotificationToast;
