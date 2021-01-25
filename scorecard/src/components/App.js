import React from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  return (
    <h1>hello zusammen</h1>
  )
}

export default App


ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('app')
);