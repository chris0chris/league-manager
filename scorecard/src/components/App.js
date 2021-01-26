import React from "react";
import ReactDOM from "react-dom";

import Navbar from "./layout/Navbar";

import { Provider } from "react-redux";
import store from "../store";
import Gamedays from "./scorecard/Gamedays";

const App = () => {
  return (
    <>
      <Gamedays />
      <Navbar />
    </>
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
