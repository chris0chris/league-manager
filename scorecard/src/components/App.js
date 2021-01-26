import React from "react";
import ReactDOM from "react-dom";

import Navbar from "./layout/Navbar";

import { Provider } from "react-redux";
import store from "../store";

const App = () => {
  return <h1>hello zusammen</h1>;
};

export default App;

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
      <Navbar />
    </Provider>
  </React.StrictMode>,
  document.getElementById("app")
);
