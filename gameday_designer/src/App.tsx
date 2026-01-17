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

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

/**
 * Main App component for Gameday Designer.
 */
const App: React.FC = () => {
  const basename = import.meta.env.DEV ? '/' : '/gamedays/gameday/design';

  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<GamedayDashboard />} />
        <Route path="/designer/:id" element={<ListDesignerApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;