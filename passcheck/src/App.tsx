import Headerdata from "./components/Headerdata";
import PlayersOverview from "./components/PlayersOverview";
import TeamOverview from "./components/TeamOverview";

import {
  HashRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';

import {TEAMS_URL, PLAYERS_URL} from "./common/urls";

function App() {
  return (
    <>
      <Headerdata />
      <Router>
      <div>
      <Routes>
        <Route path="/" element={<TeamOverview />}/>
        <Route path="/players" element={<PlayersOverview />}/>
        <Route path="*" element={
            <main style={{padding: '1rem'}}>
                <p>There is nothing here!</p>
            </main>}/>
      </Routes>
      </div>
      </Router>
    </>
  );
}

export default App;
