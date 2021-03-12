import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {store} from '../store';


const App = (props) => {
  return (
    <div className="container mt-2">
      <div className="row">
          Hello World!
      </div>
    </div>
  );
};

export default App;

ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>,
    document.getElementById('liveticker-app'),
);
