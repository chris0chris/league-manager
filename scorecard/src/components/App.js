import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import { Provider } from "react-redux";

import "regenerator-runtime/runtime";

import { store } from "../store";
import Navbar from "./layout/Navbar";
import Login from "./accounts/Login";
import PrivateRoute from "./common/PrivateRoute";
import { LOGIN_URL, OFFICIALS_URL, ROOT_URL } from "./common/urls";
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
          {console.log("url: /")}
          <PrivateRoute exact path={ROOT_URL} component={SelectGame} />
          {console.log("url: /officials")}
          <PrivateRoute exact path={OFFICIALS_URL} component={Officials} />
          {console.log("url: /login")}
          <Route exact path={LOGIN_URL} component={Login} />
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
