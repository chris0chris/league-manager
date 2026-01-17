import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer, ProgressBar } from 'react-bootstrap';
import { Notification } from '../types/designer';

interface NotificationToastProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

/**
 * Individual Toast with Progress Bar
 */
const ToastWithProgress: React.FC<{ notification: Notification; onClose: (id: string) => void }> = ({ notification, onClose }) => {
  const duration = notification.duration || 5000;
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    if (!notification.show || !notification.undoAction) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [notification.show, notification.undoAction, duration]);

  return (
    <Toast
      show={notification.show}
      onClose={() => onClose(notification.id)}
      delay={duration}
      autohide={notification.type !== 'danger'}
      bg={notification.type}
      className="mb-2"
    >
      <Toast.Header closeButton={true}>
        <i className={`bi bi-${notification.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
        <strong className="me-auto">
          {notification.title || (notification.type === 'danger' ? 'Error' : 'Notification')}
        </strong>
      </Toast.Header>
      <Toast.Body className={notification.type !== 'info' && notification.type !== 'warning' ? 'text-white' : ''}>
        <div className="d-flex flex-column gap-2">
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
                                        )}          </div>
          {notification.undoAction && (
            <ProgressBar 
              now={progress} 
              variant={notification.type === 'warning' ? 'dark' : 'light'} 
              style={{ height: '3px', marginTop: '4px' }} 
              className="bg-transparent opacity-50"
            />
          )}
        </div>
      </Toast.Body>
    </Toast>
  );
};

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
        <ToastWithProgress 
          key={notification.id} 
          notification={notification} 
          onClose={onClose} 
        />
      ))}
    </ToastContainer>
  );
};

export default NotificationToast;
