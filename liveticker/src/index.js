// eslint-disable-next-line no-unused-vars
import LivetickerApp from './components/LivetickerApp';

import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

const rootElement = document.getElementById('liveticker-app');
const root = createRoot(rootElement);

root.render(
    <StrictMode>
      <LivetickerApp />
    </StrictMode>,
);
