import React from 'react';
import { Spinner } from 'react-bootstrap';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="loading-overlay" data-testid="loading-overlay">
      <div className="loading-content">
        <Spinner animation="border" variant="primary" />
        {message && <p className="mt-2">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingOverlay;
