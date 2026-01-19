import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';

/**
 * Main Layout component for Gameday Designer.
 * Provides the shared header and a content area for nested routes.
 */
const MainLayout: React.FC = () => {
  return (
    <div className="main-layout d-flex flex-column h-100">
      <AppHeader />
      <main className="flex-grow-1 overflow-hidden" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
