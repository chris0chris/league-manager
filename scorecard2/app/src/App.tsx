import { HashRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import { LOGIN_URL, SELECT_APP_URL } from "./common/routes";
import { useEffect } from "react";
import { loadUser } from "./common/api/auth";
import SelectPasscheckOrScorecard from "./components/SelectPasscheckOrScorecard";
import SelectGame from "./components/SelectGame";
import NotificationProvider from "./components/provider/NotificationProvider";
import Notification from "./components/Notification";

function App() {
  useEffect(() => {
    loadUser();
  }, []);
  return (
    <NotificationProvider>
      <HashRouter>
        <div className="container mt-2">
          <div className="row">
            <Routes>
              <Route path={LOGIN_URL} element={<Login />} />
              <Route path="/*" element={<SelectGame />} />
              {/* <Route
              exact
              path={OFFICIALS_URL}
              element={<PrivateRoute component={Officials} />}
            />
            <Route
              exact
              path={DETAILS_URL}
              element={<PrivateRoute component={Details} />}
            />
            <Route
              exact
              path={FINALIZE_URL}
              element={<PrivateRoute component={Finalize} />}
            />
            <Route
              exact
              path={SELECT_GAME_URL}
              element={<PrivateRoute component={SelectGame} />}
            /> */}
              <Route
                path={SELECT_APP_URL}
                element={<SelectPasscheckOrScorecard />}
              />
              {/* <Route
              path="*"
              element={
                <main style={{ padding: "1rem" }}>
                  <p>There is nothing here!</p>
                </main>
              }
            /> */}
            </Routes>
          </div>
          {/* <div className="row">
          <MessageToaster />
        </div> */}
        </div>
        {/* <div className="container my-1 py-4">
        <Navbar />
      </div> */}
      </HashRouter>
      <Notification />
    </NotificationProvider>
  );
}

export default App;
