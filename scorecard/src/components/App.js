import React, {useEffect} from 'react';
import {Provider} from 'react-redux';
import {
  HashRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';

import 'regenerator-runtime/runtime';

import {store} from '../store';
import Navbar from './layout/Navbar';
import Login from './accounts/Login';
import PrivateRoute from './common/PrivateRoute';
import {DETAILS_URL,
  FINALIZE_URL,
  LOGIN_URL,
  OFFICIALS_URL} from './common/urls';
import {loadUser} from '../actions/auth';
import {getPenalties} from '../actions/config';

import SelectGame from './scorecard/SelectGame';
import Officials from './scorecard/Officials';
import Details from './scorecard/Details';
import Finalize from './scorecard/Finalize';
import MessageToaster from './scorecard/MessageToaster';

const App = (props) => {
  useEffect(() => {
    store.dispatch(loadUser());
  });
  useEffect(() => {
    store.dispatch(getPenalties());
  }, []);
  console.log('App', window.location.href);
  return (
    <Provider store={store}>
      <Router>
        <div className="container mt-2">
          <div className="row">
            <Routes>
              <Route exact path={LOGIN_URL} element={<Login />} />
              <Route exact path={OFFICIALS_URL}
                element={<PrivateRoute component={Officials} />} />
              <Route exact path={DETAILS_URL}
                element={<PrivateRoute component={Details} />} />
              <Route exact path={FINALIZE_URL}
                element={<PrivateRoute component={Finalize} />} />
              <Route exact path="/*"
                element={<PrivateRoute component={SelectGame} />} />
              <Route
                path="*"
                element={
                  <main style={{padding: '1rem'}}>
                    <p>There is nothing here!</p>
                  </main>
                }
              />
            </Routes>
          </div>
          <div className="row">
            <MessageToaster />
          </div>
        </div>
        <div className="container my-1 py-4">
          <Navbar />
        </div>
      </Router>
    </Provider>

  );
};

export default App;


