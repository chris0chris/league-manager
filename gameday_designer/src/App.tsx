/**
 * Gameday Designer App
 *
 * Main application component for the visual list-based editor
 * for creating flag football tournament schedules.
 *
 * This is the new list-based approach that replaces the
 * previous flowchart-based editor.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ListDesignerApp from './components/ListDesignerApp';
import GamedayDashboard from './components/dashboard/GamedayDashboard';
import MainLayout from './components/layout/MainLayout';
import { GamedayProvider } from './context/GamedayContext';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

/**
 * Main App component for Gameday Designer.
 */
const App: React.FC = () => {
  const basename = import.meta.env.DEV ? '/' : '/gamedays/gameday/design';

  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GamedayProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<GamedayDashboard />} />
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Route>
        </Routes>
      </GamedayProvider>
    </BrowserRouter>
  );
};

export default App;