import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';

interface MainLayoutProps {
  onGenerateTournament?: () => void;
  toolbarProps?: {
    onImport: (json: unknown) => void;
    onExport: () => void;
    gamedayStatus?: string;
    onNotify: (message: string, type: import('../../types/designer').NotificationType, title?: string) => void;
    canExport: boolean;
  };
  isLocked?: boolean;
}

/**
 * Main Layout component for Gameday Designer.
 * Provides the shared header and a content area for nested routes.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ onGenerateTournament, toolbarProps, isLocked }) => {
  return (
    <div className="main-layout d-flex flex-column h-100 overflow-hidden">
      <AppHeader 
        onGenerateTournament={onGenerateTournament} 
        toolbarProps={toolbarProps}
        isLocked={isLocked}
      />
      <main className="flex-grow-1 overflow-hidden h-100 d-flex flex-column">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
