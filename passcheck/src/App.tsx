import React from 'react';
import {HashRouter as Router, Routes, Route} from 'react-router-dom';
import ErrorMessage from './components/ErrorMessage';
import ErrorProvider from './components/ErrorProvider'; // Import ErrorProvider as the default export

// Import your components and route paths
import GameOverview from './components/GameOverview';
import RosterOverview from './components/PlayersOverview';
import {PASSCHECK_URL, ROOT_URL, SUCCESS_URL} from './common/routes';
import useError from './hooks/useError';

function App() {
  return (
    <div className='container'>
      <ErrorProvider>
        <Router>
          <div>
            <Routes>
              <Route path={ROOT_URL} element={<GameOverview />} />
              <Route
                path={`/team/:teamId/gameday/:gamedayId`}
                element={<RosterOverview />}
              />
              <Route
                path={SUCCESS_URL}
                element={
                  <div>
                    <main style={{padding: '1rem'}}>
                      <p>Passcheck erfolgreich!</p>
                    </main>
                    {/* Your button component */}
                  </div>
                }
              />
              {/* Other routes */}
            </Routes>
          </div>
        </Router>
        <div className='mt-2'>
          <ErrorMessage />
        </div>
      </ErrorProvider>
    </div>
  );
}

export default App;
