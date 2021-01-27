import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { Provider } from "react-redux";

import store from "../store";
import Navbar from "./layout/Navbar";
import Login from "./accounts/Login";
import PrivateRoute from "./common/PrivateRoute";
import { loadUser } from "../actions/auth";

import SelectGame from "./scorecard/SelectGame";
import Officials from "./scorecard/Officials";

const App = (props) => {
  useEffect(() => {
    store.dispatch(loadUser());
  });
  return (
    <Router>
      <div className="container">
        <Switch>
          <PrivateRoute exact path="/" component={SelectGame} />
          <PrivateRoute exact path="/officials" component={Officials} />
          <Route exact path="/login" component={Login} />
        </Switch>
      </div>
      <Navbar />
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
  document.getElementById("app")
);
