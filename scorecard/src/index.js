// eslint-disable-next-line no-unused-vars
import App from './components/App';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

const rootElement = document.getElementById('app');
const root = createRoot(rootElement);

root.render(
    <StrictMode>
      <App />
    </StrictMode>,
);
