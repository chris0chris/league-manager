import Button from 'react-bootstrap/Button';
import GameOverview from './components/GameOverview';
import RosterOverview from './components/PlayersOverview';

import {Route, HashRouter as Router, Routes} from 'react-router-dom';
import {PASSCHECK_URL, ROOT_URL, SUCCESS_URL} from './common/routes';
import Error from './components/Error';

//import {TEAMS_URL, PLAYERS_URL} from "./common/urls";

function App() {
  return (
    <>
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
                  <Button
                    onClick={() => {
                      window.location.href = PASSCHECK_URL;
                    }}
                  >
                    Zurück
                  </Button>
                </div>
              }
            />
            <Route path='/error' element={<Error />} />
            <Route
              path='*'
              element={
                <main style={{padding: '1rem'}}>
                  <p>There is nothing here!</p>
                </main>
              }
            />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
