import {Route, HashRouter as Router, Routes} from 'react-router-dom';
import Message from './components/Message';
import MessageProvider from './components/MessageProvider';

import {ROOT_URL, SUCCESS_URL} from './common/routes';
import GameOverview from './components/GameOverview';
import RosterOverview from './components/RosterOverview';

function App() {
  return (
    <div className='container'>
      <MessageProvider>
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
                  </div>
                }
              />
            </Routes>
          </div>
        </Router>
        <div className='mt-2'>
          <Message />
        </div>
      </MessageProvider>
    </div>
  );
}

export default App;
