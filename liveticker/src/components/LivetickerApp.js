import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {store} from '../store';
import 'regenerator-runtime/runtime';
import Liveticker from './liveticker/Liveticker';


const LivetickerApp = (props) => {
  return (
    <div className='container mt-2'>
      <Liveticker />
      <div className='row text-end'>
        <div style={{fontSize: 'x-small', color: 'white'}}>
          {VERSION}
        </div>
      </div>
    </div>
  );
};

export default LivetickerApp;

ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <LivetickerApp />
      </Provider>
    </React.StrictMode>,
    document.getElementById('liveticker-app'),
);
