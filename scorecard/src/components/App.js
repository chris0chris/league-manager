import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {
  HashRouter as Router,
  Route,
  Switch,
} from 'react-router-dom';
import {Provider} from 'react-redux';

import 'regenerator-runtime/runtime';

import {store} from '../store';
import Navbar from './layout/Navbar';
import Login from './accounts/Login';
import PrivateRoute from './common/PrivateRoute';
import {DETAILS_URL,
  FINALIZE_URL,
  LOGIN_URL,
  OFFICIALS_URL,
  ROOT_URL} from './common/urls';
import {loadUser} from '../actions/auth';

import SelectGame from './scorecard/SelectGame';
import Officials from './scorecard/Officials';
import Details from './scorecard/Details';
import Finalize from './scorecard/Finalize';

const App = (props) => {
  useEffect(() => {
    store.dispatch(loadUser());
  });
  return (
    <Router>
      <div className="container mt-2">
        <div className="row">
          <Switch>
            <PrivateRoute exact path={ROOT_URL} component={SelectGame} />
            <PrivateRoute exact path={OFFICIALS_URL} component={Officials} />
            <PrivateRoute exact path={DETAILS_URL} component={Details} />
            <PrivateRoute exact path={FINALIZE_URL} component={Finalize} />
            <Route exact path={LOGIN_URL} component={Login} />
          </Switch>
        </div>
      </div>
      <div className="container my-1 py-4">
        <Navbar />
      </div>
    </Router>
  );
};

export default App;

ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>,
    document.getElementById('app'),
);
