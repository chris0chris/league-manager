import React from 'react';
import {Provider} from 'react-redux';
import {store} from '../store';
import 'regenerator-runtime/runtime';

import Liveticker from './liveticker/Liveticker';


const LivetickerApp = (props) => {
  return (
    <Provider store={store}>
      <div className='container mt-2'>
        <Liveticker />
      </div>
    </Provider>
  );
};

export default LivetickerApp;
