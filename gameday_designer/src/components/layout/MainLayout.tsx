import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';

/**
 * Main Layout component for Gameday Designer.
 * Provides the shared header and a content area for nested routes.
 */
const MainLayout: React.FC = () => {
  return (
    <div className="main-layout d-flex flex-column h-100 overflow-hidden">
      <AppHeader />
      <main className="flex-grow-1 overflow-hidden h-100 d-flex flex-column">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
