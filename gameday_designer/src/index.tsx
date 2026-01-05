import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/config';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('gameday-designer') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
