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
import ListDesignerApp from './components/ListDesignerApp';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

/**
 * Main App component for Gameday Designer.
 */
const App: React.FC = () => {
  return <ListDesignerApp />;
};

export default App;
